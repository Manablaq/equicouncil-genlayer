import { createClient, isSuccessful } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { CONTRACT, CHAIN_HEX, CHAIN_ID, RPC, MAX_FEE_WEI } from './config';
import { normalizeRecord } from './validation';

// No private keys are stored here. Reads use an account-free SDK client.
if (Number(studioDevnet.id)!==CHAIN_ID) throw new Error('GenLayer SDK chain definition does not match the certified Devnet.');
export const reader = createClient({ chain: studioDevnet });
const latestFinal = TransactionHashVariant.LATEST_FINAL;

export async function walletAddress() {
  if (!window.ethereum?.request) throw new Error('Install an EIP-1193 wallet such as MetaMask.');
  const accounts = await window.ethereum.request({method:'eth_requestAccounts'});
  if (!Array.isArray(accounts) || !accounts[0]) throw new Error('No wallet account selected.');
  return accounts[0];
}
export async function ensureWalletNetwork() {
  const wallet=window.ethereum;
  if (!wallet?.request) throw new Error('No browser wallet found.');
  let chain=await wallet.request({method:'eth_chainId'});
  if (Number(chain)!==CHAIN_ID) {
    try { await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:CHAIN_HEX}]}); }
    catch(error) {
      if (Number(error?.code)!==4902) throw error;
      await wallet.request({method:'wallet_addEthereumChain',params:[{
        chainId:CHAIN_HEX,chainName:'GenLayer Studio Devnet',nativeCurrency:{name:'GEN',symbol:'GEN',decimals:18},
        rpcUrls:[RPC],blockExplorerUrls:['https://explorer-studio-dev.genlayer.com']
      }]});
    }
    chain=await wallet.request({method:'eth_chainId'});
    if (Number(chain)!==CHAIN_ID) throw new Error('Wallet is not on GenLayer Studio Devnet (61997).');
  }
  return true;
}
export async function readMethod(method,args=[]) {
  return reader.readContract({address:CONTRACT,functionName:method,args,transactionHashVariant:latestFinal});
}
export async function getSessionCount() {
  const raw = await readMethod('get_session_count',[]);
  const count = Number(raw);
  if (!Number.isSafeInteger(count)||count<0) throw new Error('Unexpected session count response.');
  return count;
}
export async function getFullSession(id) {
  const session=normalizeRecord(await readMethod('get_session',[id]),'Session');
  const participants=await Promise.all(Array.from({length:Math.min(3,Number(session.participants)||0)},(_,i)=>
    readMethod('get_participant',[id,i+1]).then(v=>normalizeRecord(v,`Participant ${i+1}`))));
  let round=null;
  if (session.status!=='OPEN' || Number(session.round)>1) {
    try { round=normalizeRecord(await readMethod('get_round',[id,Number(session.round)]),'Round'); }
    catch(error) { if (session.status==='LOCKED'||session.status==='PROPOSED'||session.status==='RATIFIED') throw error; }
  }
  return {session,participants,round};
}
export async function feeQuote(method,args,address) {
  // The account-backed client binds the noncommitting simulation to the actual signer.
  // No signing or sending occurs until writeMethod is explicitly called.
  const pricingClient=createClient({chain:studioDevnet,account:address,provider:window.ethereum});
  const estimate=await pricingClient.estimateTransactionFeesForWrite({address:CONTRACT,functionName:method,args});
  const deposit=BigInt(estimate.feeValue);
  if (deposit<=0n || deposit>MAX_FEE_WEI) throw new Error('Fee exceeds the reviewed 0.0002 GEN cap. No transaction will be sent.');
  if (!estimate.distribution) throw new Error('GenLayer fee distribution was unavailable.');
  return {fees:{distribution:estimate.distribution,feeValue:estimate.feeValue},deposit};
}
export async function writeMethod(address,method,args,fees) {
  await ensureWalletNetwork();
  const accounts=await window.ethereum.request({method:'eth_accounts'});
  if (!Array.isArray(accounts)||accounts[0]?.toLowerCase()!==address.toLowerCase()) throw new Error('Connected wallet changed. Reconnect before signing.');
  // The SDK sends the signed transaction via the injected wallet; no app-held keys.
  const writer=createClient({chain:studioDevnet,account:address,provider:window.ethereum});
  return writer.writeContract({address:CONTRACT,functionName:method,args,fees});
}
export async function waitForFinal(txHash) {
  const result=await reader.waitForFinalization({hash:txHash});
  if (!isSuccessful(result)) throw new Error(`Transaction finalized without success: ${String(result?.statusName??'unknown')} / ${String(result?.txExecutionResultName??'unknown')}`);
  return result;
}
