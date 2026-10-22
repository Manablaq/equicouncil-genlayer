import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {CONTRACT,CHAIN_ID,EXPLORER,FINAL_TX,MAX_FEE_WEI,PUBLIC_EVIDENCE_HASH,WAITING_KEY} from './config';
import {walletAddress,ensureWalletNetwork,getSessionCount,getFullSession,feeQuote,writeMethod,waitForFinal} from './genlayer';
import {validateCreate,validateTerms,canPerform,formatWei,shortAddress,friendlyError} from './validation';

const DEFAULT_FORM={title:'',units:'6',minimum:'1',maximum:'4',preference:''};
const STAGES=['OPEN','LOCKED','PROPOSED','RATIFIED'];
const NAV=[['overview','Overview'],['sessions','Sessions'],['create','Create session'],['verification','Verification']];
function loadUnresolved(){try{return JSON.parse(localStorage.getItem(WAITING_KEY)||'null');}catch{return null;}}
const copy = (s)=>navigator.clipboard?.writeText(String(s));
function Icon({name,size=18}){
  const paths={
    grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    layers:<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
    plus:<path d="M12 5v14M5 12h14"/>,
    shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    wallet:<><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 15h2"/></>,
    arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 8a7 7 0 0 1 12-1l2 5M4 12l2 5a7 7 0 0 0 12-1"/></>,
    link:<><path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 1 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></>,
    alert:<><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
    users:<><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    spark:<><path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3ZM20 18v5m-2.5-2.5h5"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    log:<><path d="M5 3h11l4 4v14H5z"/><path d="M16 3v5h4M9 13h7M9 17h7"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.grid}</svg>;
}
function AddressTag({value}){return <button className="address-tag" title="Copy address" onClick={()=>copy(value)}>{shortAddress(value)} <span>↗</span></button>}
function Status({status}){const s=(status||'UNKNOWN').toUpperCase();return <span className={'status status-'+s.toLowerCase()}><span className="status-dot"/>{s}</span>}
function Stats({label,value,note,icon}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon}/></span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>}
function Notice({type='info',children,onClose}){return <div className={'notice notice-'+type}><Icon name={type==='error'?'alert':'check'} size={18}/><div>{children}</div>{onClose&&<button className="notice-close" onClick={onClose}>×</button>}</div>}
function InfoRow({label,children}){return <div className="info-row"><span>{label}</span><strong>{children}</strong></div>}
export default function App(){
  const [page,setPage]=useState('overview');
  const [wallet,setWallet]=useState('');
  const [walletChain,setWalletChain]=useState(null);
  const [total,setTotal]=useState(null);
  const [recent,setRecent]=useState([]);
  const [selected,setSelected]=useState('session:1');
  const [lookup,setLookup]=useState('session:1');
  const [details,setDetails]=useState(null);
  const [loading,setLoading]=useState(false);
  const [notice,setNotice]=useState(null);
  const [form,setForm]=useState(DEFAULT_FORM);
  const [join,setJoin]=useState({minimum:'1',maximum:'4',preference:''});
  const [quote,setQuote]=useState(null);
  const [feeLoading,setFeeLoading]=useState(false);
  const [writing,setWriting]=useState(false);
  const [unresolved,setUnresolved]=useState(loadUnresolved);
  const [lastTx,setLastTx]=useState(null);
  const [showUnlock,setShowUnlock]=useState(false);
  const [busyKey,setBusyKey]=useState(0);
  const address=wallet?.toLowerCase();
  const session=details?.session;
  const participants=details?.participants||[];
  const role=participants.findIndex(p=>p.address?.toLowerCase()===address)+1;
  const myParticipant=role?participants[role-1]:null;
  const isWrongChain=wallet && walletChain!==CHAIN_ID;
  const showError=(message)=>{setNotice({type:'error',message:friendlyError(message)});};
  const saveLock=(record)=>{setUnresolved(record);if(record)localStorage.setItem(WAITING_KEY,JSON.stringify(record));else localStorage.removeItem(WAITING_KEY);};

  const loadRecent=useCallback(async()=>{
    const count=await getSessionCount();
    setTotal(count);
    const ids=Array.from({length:Math.min(count,8)},(_,i)=>`session:${count-i}`);
    const summaries=await Promise.allSettled(ids.map(id=>getFullSession(id)));
    setRecent(summaries.map((r,i)=>r.status==='fulfilled'?r.value.session:null).filter(Boolean));
    return count;
  },[]);
  const loadSelected=useCallback(async(id,quiet=false)=>{
    if(!/^session:[1-9]\d*$/.test(id)) { if(!quiet)showError('Use a valid session ID such as session:1.'); return; }
    setLoading(true);if(!quiet)setNotice(null);
    try { const found=await getFullSession(id);setSelected(id);setLookup(id);setDetails(found); }
    catch(error){setDetails(null);if(!quiet)showError(error);}
    finally{setLoading(false);}
  },[]);
  const refresh=useCallback(async()=>{
    setBusyKey(x=>x+1);
    try {await loadRecent();await loadSelected(selected,true);setNotice(null);}
    catch(error){showError(error);}
  },[loadRecent,loadSelected,selected]);
  useEffect(()=>{loadRecent().catch(showError);loadSelected('session:1',true);
    const provider=window.ethereum;
    if(!provider?.request)return;
    const sync=async()=>{
      try{const accounts=await provider.request({method:'eth_accounts'});setWallet(accounts?.[0]||'');
        const chain=await provider.request({method:'eth_chainId'});setWalletChain(Number(chain));}catch{/* no account */}
    };
    const accountsChanged=(xs)=>setWallet(xs?.[0]||'');
    const chainChanged=(chain)=>setWalletChain(Number(chain));
    sync();provider.on?.('accountsChanged',accountsChanged);provider.on?.('chainChanged',chainChanged);
    return()=>{provider.removeListener?.('accountsChanged',accountsChanged);provider.removeListener?.('chainChanged',chainChanged);};
  },[loadRecent,loadSelected]);
  const connect=async()=>{try{const a=await walletAddress();await ensureWalletNetwork();setWallet(a);setWalletChain(CHAIN_ID);setNotice({type:'success',message:'Wallet connected on GenLayer Studio Devnet.'});}catch(error){showError(error)}};

  async function prepare(method,args,label,expectedId=selected){
    if(unresolved) return showError('A previous submission is unresolved. Check the transaction first. Do not resubmit.');
    if(!wallet)return showError('Connect a wallet before submitting a transaction.');
    if(isWrongChain)return showError('Switch your wallet to Studio Devnet (61997).');
    if(method!=='create_session' && !canPerform(method,session,role,myParticipant,details?.round))return showError('Your wallet is not eligible for this action in the current session state.');
    setFeeLoading(true);setNotice(null);
    try {const estimate=await feeQuote(method,args,wallet);setQuote({method,args,label,expectedId,fees:estimate.fees,deposit:estimate.deposit});}
    catch(error){showError(error)}finally{setFeeLoading(false)}
  }
  function createSession(){try{prepare('create_session',validateCreate(form),'Create negotiation session','')}catch(error){showError(error)}}
  function joinSession(method='join_session'){
    try{const args=[selected,...validateTerms(session?.units,join.minimum,join.maximum,join.preference)];prepare(method,args,method==='join_session'?'Join as participant':'Update my requirements');}
    catch(error){showError(error)}
  }
  async function confirmTransaction(){
    if(!quote||writing||unresolved)return;
    const attempt=quote;setQuote(null);setWriting(true);setNotice(null);
    const lock={method:attempt.method,sessionId:attempt.expectedId||'new-session',address:wallet,createdAt:new Date().toISOString(),stage:'wallet',hash:null};
    try{
      await ensureWalletNetwork();
      if(attempt.method!=='create_session'){
        const latest=await getFullSession(attempt.expectedId);
        const ownRole=latest.participants.findIndex(p=>p.address?.toLowerCase()===wallet.toLowerCase())+1;
        if(!canPerform(attempt.method,latest.session,ownRole,ownRole?latest.participants[ownRole-1]:null,latest.round))throw new Error('Session changed since fee review. No write submitted; refresh first.');
      }
      saveLock(lock); // Fail closed across tab refresh and uncertain SDK/wallet responses.
      const txHash=await writeMethod(wallet,attempt.method,attempt.args,attempt.fees);
      saveLock({...lock,stage:'finality',hash:txHash});setLastTx(txHash);
      setNotice({type:'info',message:`Submitted ${attempt.method}. Awaiting final settlement. Never click twice. Transaction ${shortAddress(txHash)}.`});
      await waitForFinal(txHash);
      saveLock(null);setNotice({type:'success',message:`${attempt.label} finalized successfully. Transaction ${txHash}`});
      const count=await loadRecent();
      if(attempt.method==='create_session') await loadSelected(`session:${count}`,true);
      else await loadSelected(attempt.expectedId,true);
      setPage('sessions');
    }catch(error){
      const message=friendlyError(error);
      // Only clear when the wallet explicitly rejects before broadcasting.
      if(!loadUnresolved()) showError(error);
      else if(/rejected|denied/i.test(message)&&loadUnresolved()?.stage==='wallet'){saveLock(null);showError(message);}
      else showError(`${message} Submission status may be uncertain. Keep the safety lock and inspect the on-chain state before any retry.`);
    }finally{setWriting(false)}
  }
  async function resumeFinality(){if(!unresolved?.hash)return;
    setWriting(true);setNotice(null);
    try {await waitForFinal(unresolved.hash);saveLock(null);setNotice({type:'success',message:'Previously submitted transaction finalized successfully.'});await refresh();}
    catch(error){showError(`${friendlyError(error)} Keep the submission lock in place.`)}finally{setWriting(false)}
  }
  const resetLock=()=>{
    if(!showUnlock){setShowUnlock(true);return;}
    if(!window.confirm('Only clear after independently checking the transaction and state. A duplicate blockchain submission can charge twice. Clear local safety lock?'))return;
    saveLock(null);setShowUnlock(false);setNotice({type:'info',message:'Local lock cleared. No blockchain action occurred. Refresh contract state before submitting.'});
  };
  const stage=STAGES.indexOf(session?.status);const isRejected=session?.status==='REJECTED';
  const potentialAction=useMemo(()=>{
    if(!session||!wallet)return null;
    for(const [method,label] of [['lock_session','Lock session'],['evaluate_allocations','Run AI allocation'],['ratify_proposal','Approve proposal'],['finalize_session','Finalize agreement'],['open_revision','Open revision']])
      if(canPerform(method,session,role,myParticipant,details?.round))return {method,label};
    return null;
  },[session,wallet,role,myParticipant,details]);
  const doSimple=(action)=>prepare(action.method,[selected],action.label);
  const changeForm=(key,value)=>setForm(prev=>({...prev,[key]:value}));
  const changeJoin=(key,value)=>setJoin(prev=>({...prev,[key]:value}));

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={()=>setPage('overview')}><div className="brand-symbol">E<span>•</span></div><div><strong>EquiCouncil</strong><small>DECISIONS, IN CONSENSUS</small></div></button>
      <div className="sidebar-section">WORKSPACE</div>
      <nav aria-label="Main navigation">{NAV.map(([id,label])=><button key={id} className={'nav-link '+(page===id?'active':'')} onClick={()=>setPage(id)}><Icon name={{overview:'grid',sessions:'layers',create:'plus',verification:'shield'}[id]}/>{label}{page===id&&<span className="nav-active-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="devnet-card"><span className="live-pulse"/><div><strong>Studio Devnet</strong><small>Chain 61997 · GEN</small></div></div><div className="side-foot">POWERED BY <strong>GenLayer</strong><br/>Intelligent contract v1</div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><span>EquiCouncil</span><b>/</b><strong>{NAV.find(x=>x[0]===page)?.[1]}</strong></div><div className="topbar-actions"><span className="top-network"><span className="live-pulse"/>GenLayer Devnet</span><button className="icon-button" aria-label="Refresh blockchain state" title="Refresh blockchain state" onClick={refresh} disabled={loading}><Icon name="refresh"/></button><button className={'wallet-button '+(wallet?'connected':'')} onClick={connect}><Icon name="wallet"/>{wallet?shortAddress(wallet):'Connect wallet'}</button></div></header>
      <main className="content">
        {notice&&<Notice type={notice.type} onClose={()=>setNotice(null)}>{notice.message}</Notice>}
        {isWrongChain&&<Notice type="error">Connected to the wrong wallet network. Switch to chain 61997 before submitting any transaction. <button className="text-action" onClick={connect}>Switch wallet</button></Notice>}
        {unresolved&&<div className="safety-banner"><div className="safety-icon"><Icon name="alert"/></div><div className="safety-main"><strong>Submission safety lock active</strong><p>{unresolved.method} · {unresolved.sessionId}. {unresolved.hash?`Hash: ${unresolved.hash}`:'The write call may have reached the wallet or network; outcome unknown.'} No new writes are permitted until verified.</p><div className="safety-actions">{unresolved.hash&&<button className="button button-small" disabled={writing} onClick={resumeFinality}>Check finality</button>}<button className="button button-ghost button-small" onClick={resetLock}>{showUnlock?'Acknowledge verified state and clear':'Review lock options'}</button></div></div></div>}
        {page==='overview'&&<>
          <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> THE CONSENSUS WORKSPACE</div><h1>Fair decisions.<br/><em>Built together.</em></h1><p>Three parties. One shared resource pool. AI-assisted allocation backed by independent validator consensus—and unanimous human approval.</p><div className="hero-actions"><button className="button button-primary" onClick={()=>setPage('create')}>Create a council <Icon name="arrow"/></button><button className="button button-outline" onClick={()=>setPage('sessions')}>Explore sessions <Icon name="arrow"/></button></div></div><div className="hero-art" aria-hidden="true"><div className="orb orb-a"/><div className="orb orb-b"/><div className="orb orb-c"/><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-glyph">≋</div><div className="float-chip chip-top">03 <span>VOICES</span></div><div className="float-chip chip-bottom"><span className="chip-check">✓</span> CONSENSUS</div></div></section>
          <div className="section-header"><div><span className="mini-overline">LIVE CONTRACT STATE</span><h2>Workspace at a glance</h2></div><button className="subtle-link" onClick={refresh}><Icon name="refresh" size={15}/> Refresh data</button></div>
          <div className="stats-grid"><Stats label="Total sessions" value={total??'—'} note="From the deployed contract" icon="layers"/><Stats label="Participants per council" value="03" note="Distinct wallet approvals" icon="users"/><Stats label="Certified lifecycle" value="9 / 9" note="Completed on Studio Devnet" icon="shield"/></div>
          <div className="columns columns-overview"><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent negotiations</h3><p>On-chain sessions · latest-final state</p></div><button className="subtle-link" onClick={()=>setPage('sessions')}>View all <Icon name="arrow" size={15}/></button></div><div className="session-list">{recent.length===0?<div className="empty-state">{total===0?'No sessions created yet. Start the first council.':'No sessions loaded. Refresh to query Studio Devnet.'}</div>:recent.slice(0,5).map(s=><button key={s.id} className="session-line" onClick={()=>{setSelected(s.id);setLookup(s.id);loadSelected(s.id);setPage('sessions')}}><span className="session-avatar">{s.id?.replace('session:','#')}</span><span className="session-line-main"><strong>{s.title}</strong><small>{s.id} · {s.participants}/3 participants</small></span><Status status={s.status}/><span className="line-arrow">→</span></button>)}</div></section>
          <section className="panel process-panel"><div className="panel-heading"><div><h3>How a council works</h3><p>Trust the process, not a single decision-maker.</p></div></div><div className="process-steps"><div><span>01</span><div><strong>Form a council</strong><p>Three wallets submit limits and explain their needs.</p></div></div><div><span>02</span><div><strong>Reach an allocation</strong><p>Validators check AI urgency rankings; code allocates units.</p></div></div><div><span>03</span><div><strong>Ratify together</strong><p>Every participant approves before finalization.</p></div></div></div></section></div>
        </>}
        {page==='create'&&<><div className="page-intro"><div className="mini-overline">START HERE</div><h1>Start a new council<span className="title-dot">.</span></h1><p>Describe what you're sharing and the minimum resources you require. Two other wallet addresses can join after your transaction finalizes.</p></div><div className="columns columns-form"><div className="panel form-panel"><div className="panel-heading"><div><h3>Session details</h3><p>A new on-chain negotiation. All inputs are public.</p></div><span className="step-bubble">01 / 03</span></div><div className="field"><label htmlFor="title">Council title</label><input id="title" maxLength={80} value={form.title} onChange={e=>changeForm('title',e.target.value)} placeholder="e.g. Shared infrastructure capacity"/><small>4–80 characters</small></div><div className="field"><label htmlFor="units">Shared resource units</label><input id="units" type="number" min={3} max={9} value={form.units} onChange={e=>changeForm('units',e.target.value)}/><small>Choose 3–9 indivisible units for three participants</small></div><div className="form-row"><div className="field"><label htmlFor="min">Your minimum</label><input id="min" type="number" min={1} max={9} value={form.minimum} onChange={e=>changeForm('minimum',e.target.value)}/></div><div className="field"><label htmlFor="max">Your maximum</label><input id="max" type="number" min={1} max={9} value={form.maximum} onChange={e=>changeForm('maximum',e.target.value)}/></div></div><div className="field"><label htmlFor="preference">Why do you need these resources?</label><textarea id="preference" rows={5} maxLength={480} value={form.preference} onChange={e=>changeForm('preference',e.target.value)} placeholder="Explain your operational need, timing and constraints. This description will be evaluated by AI validators."/><small>{form.preference.trim().length} / 480 characters · minimum 20</small></div><button className="button button-primary button-block" disabled={feeLoading||writing||!!unresolved||!wallet} onClick={createSession}>{feeLoading?'Estimating fees…':'Review and create session'} <Icon name="arrow"/></button>{!wallet&&<p className="form-hint">Connect your wallet to activate transaction signing.</p>}</div><aside className="panel guide-panel"><div className="guide-illustration"><Icon name="spark" size={44}/></div><h3>Built for meaningful agreement</h3><p>Your urgency explanation is classified into a bounded weight of 1, 2 or 3. The deterministic allocation algorithm enforces all resource constraints.</p><div className="guide-note"><Icon name="shield" size={19}/><span>Creating a session is a live GenLayer transaction with an estimated network fee.</span></div><div className="guide-note"><Icon name="users" size={19}/><span>You need three different wallet addresses to complete a council.</span></div></aside></div></>}
        {page==='sessions'&&<><div className="page-intro with-action"><div><div className="mini-overline">LIVE NEGOTIATION SPACE</div><h1>Your councils<span className="title-dot">.</span></h1><p>Inspect real contract state and progress your council with wallet-signed actions.</p></div><button className="button button-primary" onClick={()=>setPage('create')}><Icon name="plus"/> New council</button></div><div className="lookup-bar"><label htmlFor="lookup">SESSION ID</label><input id="lookup" value={lookup} placeholder="session:1" onChange={e=>setLookup(e.target.value)}/><button className="button button-small" disabled={loading} onClick={()=>loadSelected(lookup)}>Load session <Icon name="arrow" size={15}/></button><button className="icon-button" aria-label="Refresh session" onClick={refresh}><Icon name="refresh"/></button></div>{loading?<div className="panel empty-state">Loading latest finalized contract state…</div>:session?<><div className="session-head panel"><div className="session-head-top"><div><span className="mini-overline">{session.id} · ROUND {session.round}</span><h2>{session.title}</h2></div><Status status={session.status}/></div><div className="session-meta"><span><Icon name="layers" size={16}/> {session.units} total units</span><span><Icon name="users" size={16}/> {session.participants}/3 participants</span><span><Icon name="check" size={16}/> {session.approvals}/3 approvals</span><span><Icon name="shield" size={16}/> Chain {CHAIN_ID}</span></div><div className="milestone-strip">{STAGES.map((s,i)=><div key={s} className={'milestone '+(i<=stage?'complete':'')+(isRejected?' muted':'')}><div className="milestone-dot">{i<=stage?'✓':i+1}</div><span>{s}</span></div>)}</div></div><div className="columns columns-detail"><section className="panel"><div className="panel-heading"><div><h3>Council members</h3><p>Each member signs with their own wallet.</p></div></div><div className="member-list">{participants.map((p,i)=><div className="member-card" key={p.index??i}><span className="member-number">0{i+1}</span><div className="member-body"><div className="member-top"><strong>Participant {String.fromCharCode(65+i)} {p.address?.toLowerCase()===address&&<span className="you">YOU</span>}</strong><span className={'approval '+(p.approved_current_round?'approved':'')}>{p.approved_current_round?'✓ Approved':'Not approved'}</span></div><AddressTag value={p.address}/><p>{p.preference}</p><small>Allocation bounds: {p.minimum}–{p.maximum} units</small></div></div>)}{Array.from({length:Math.max(0,3-participants.length)},(_,i)=><div className="member-card invite" key={`invite-${i}`}><span className="member-number">0{participants.length+i+1}</span><div><strong>Open seat</strong><p>A different wallet can join while session is OPEN.</p></div></div>)}</div></section><section className="detail-right"><div className="panel"><div className="panel-heading"><div><h3>Allocation outcome</h3><p>Consensus-checked urgency and bounded distribution.</p></div><Icon name="spark" size={21}/></div>{details.round?<><div className="allocation-bars">{Array.isArray(details.round.allocation)?details.round.allocation.map((n,i)=><div className="allocation-row" key={i}><span>Participant {String.fromCharCode(65+i)}</span><div className="bar-track"><div style={{width:`${Math.max(0,Math.min(100,Number(n)/(Number(session.units)||1)*100))}%`}}/></div><strong>{n}</strong></div>):<p className="muted">Allocation has not been proposed yet.</p>}</div><div className="round-extra"><InfoRow label="Round status"><Status status={details.round.status}/></InfoRow>{Array.isArray(details.round.weights)&&<InfoRow label="AI urgency weights">{details.round.weights.join(' · ')}</InfoRow>}</div></>:<div className="empty-tight"><Icon name="clock"/><p>Allocation appears after the session is locked and evaluated.</p></div>}</div><div className="panel action-panel"><div className="panel-heading"><div><h3>Take action</h3><p>Actions shown for your connected wallet.</p></div></div>{!wallet?<div className="empty-tight"><p>Connect your wallet to join, vote or finalize this session.</p><button className="button button-outline" onClick={connect}>Connect wallet</button></div>:<><div className="wallet-role"><span>CONNECTED ROLE</span><strong>{role?`Participant ${String.fromCharCode(64+role)}`:'Not a participant'}</strong></div>{(canPerform('join_session',session,role,myParticipant,details.round)||canPerform('update_preference',session,role,myParticipant,details.round))&&<div className="join-form"><div className="form-row"><div className="field"><label>Minimum units</label><input type="number" min={1} max={9} value={join.minimum} onChange={e=>changeJoin('minimum',e.target.value)}/></div><div className="field"><label>Maximum units</label><input type="number" min={1} max={9} value={join.maximum} onChange={e=>changeJoin('maximum',e.target.value)}/></div></div><div className="field"><label>Your urgency explanation</label><textarea rows={4} maxLength={480} value={join.preference} onChange={e=>changeJoin('preference',e.target.value)} placeholder="20–480 characters describing your needs"/></div><button className="button button-primary button-block" disabled={feeLoading||writing||!!unresolved} onClick={()=>joinSession(role?'update_preference':'join_session')}>{role?'Update requirements':'Join this council'} <Icon name="arrow"/></button></div>}{potentialAction&&<button className="button button-primary button-block" disabled={feeLoading||writing||!!unresolved} onClick={()=>doSimple(potentialAction)}>{potentialAction.label} <Icon name="arrow"/></button>}{canPerform('reject_proposal',session,role,myParticipant,details.round)&&<button className="button button-danger button-block" disabled={feeLoading||writing||!!unresolved} onClick={()=>prepare('reject_proposal',[selected],'Reject current proposal')}>Reject proposal</button>}{!potentialAction&&!canPerform('join_session',session,role,myParticipant,details.round)&&!canPerform('update_preference',session,role,myParticipant,details.round)&&!canPerform('reject_proposal',session,role,myParticipant,details.round)&&<div className="empty-tight"><p>No available action for this wallet in the current state. Switch accounts or inspect another session.</p></div>}</>}{feeLoading&&<div className="inline-loader">Simulating the exact write and pricing the fee…</div>}</div></section></div></>:<div className="panel empty-state">No finalized session loaded. Enter a valid session ID or select one from the overview.</div>}</>}
        {page==='verification'&&<><div className="page-intro"><div className="mini-overline">TRANSPARENT BY DESIGN</div><h1>Verify the outcome<span className="title-dot">.</span></h1><p>On-chain settlement, independent validator consensus and a verifiable record of the certified demonstration.</p></div><div className="verification-hero"><div className="verification-seal"><Icon name="shield" size={48}/></div><div><div className="eyebrow">CONTROLLED STUDIO DEVNET DEMONSTRATION</div><h2>9 of 9 lifecycle steps certified.</h2><p>The demonstration finalized session:1 with unanimous approval. This does not imply a third-party security audit or a production-mainnet deployment.</p></div></div><div className="columns columns-detail"><section className="panel"><h3>On-chain reference</h3><InfoRow label="Network">Studio Devnet · {CHAIN_ID}</InfoRow><InfoRow label="Contract"><AddressTag value={CONTRACT}/></InfoRow><InfoRow label="Verified session">session:1</InfoRow><InfoRow label="Final state">RATIFIED · 3 of 3 approvals</InfoRow><InfoRow label="Finalization transaction"><AddressTag value={FINAL_TX}/></InfoRow><a className="external-link" href={EXPLORER} target="_blank" rel="noreferrer">Open GenLayer explorer ↗</a></section><section className="panel"><h3>Evidence integrity</h3><p className="muted">R88 public-evidence.json SHA-256</p><div className="hash-box">{PUBLIC_EVIDENCE_HASH}</div><button className="button button-outline button-small" onClick={()=>copy(PUBLIC_EVIDENCE_HASH)}>Copy evidence hash</button><p className="small-disclosure">R89 packaged the public reviewer evidence. Keep private execution journals and signer files off public repositories.</p></section></div><section className="panel disclosures"><h3>Scope & limitations</h3><p>This dApp is connected to a development-preview network that can reset. Existing transaction evidence refers to the certified historical deployment. This website introduces new wallet and transaction interaction surfaces that still need an end-to-end browser smoke test.</p><p>Historical audit exceptions: participant A's nonce 36 remains unidentified and A's nonce 45 lacks a separate independent finality record. The step-8 validator mismatch was reconciled in R82. No historical evidence was rewritten.</p></section></>}
        <footer className="app-footer"><span>© EquiCouncil · Intelligent collaboration on GenLayer</span><span>Studio Devnet / Chain {CHAIN_ID} · <button onClick={()=>copy(CONTRACT)}>Copy contract ↗</button></span></footer>
      </main>
    </div>
    {quote&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setQuote(null)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="modal-icon"><Icon name="shield" size={25}/></div><div className="mini-overline">WALLET SIGNATURE REQUIRED</div><h2 id="review-title">Review your transaction</h2><p>You are about to submit a real GenLayer state-changing transaction. The connected wallet will request your signature.</p><div className="modal-data"><InfoRow label="Action"><code>{quote.method}</code></InfoRow><InfoRow label="Session">{quote.expectedId||'New session'}</InfoRow><InfoRow label="Signer"><span className="mono">{shortAddress(wallet)}</span></InfoRow><InfoRow label="Fee deposit"><strong>{formatWei(quote.deposit)}</strong></InfoRow><InfoRow label="Maximum allowed">{formatWei(MAX_FEE_WEI)}</InfoRow><InfoRow label="Network">Studio Devnet (61997)</InfoRow></div><Notice type="info">The fee deposit is not the final charge. Wallet-sign once, then wait for GenLayer finalization. Do not resubmit if the result is uncertain.</Notice><div className="modal-actions"><button className="button button-outline" onClick={()=>setQuote(null)}>Cancel</button><button className="button button-primary" onClick={confirmTransaction} disabled={writing}>Sign and submit <Icon name="arrow"/></button></div></section></div>}
  </div>;
}
