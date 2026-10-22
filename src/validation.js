export const clampText = (v) => String(v ?? '').trim();
export function betweenInt(v,min,max) { return Number.isInteger(Number(v)) && String(v).trim() !== '' && Number(v)>=min && Number(v)<=max; }
export function validateTerms(units,min,max,preference) {
  if (!betweenInt(min,1,9)||!betweenInt(max,1,9)||Number(min)>Number(max)||Number(max)>Number(units))
    throw new Error('Set resource bounds between 1 and the session pool, with minimum ≤ maximum.');
  const value=clampText(preference);
  if (value.length<20 || value.length>480) throw new Error('Explain your resource need in 20–480 characters.');
  return [Number(min),Number(max),value];
}
export function validateCreate(form) {
  const title=clampText(form.title);
  if (title.length<4||title.length>80) throw new Error('Session title must be 4–80 characters.');
  if (!betweenInt(form.units,3,9)) throw new Error('Resource pool must contain 3–9 units.');
  return [title,Number(form.units),...validateTerms(form.units,form.minimum,form.maximum,form.preference)];
}
export function canPerform(method,session,role,participant,round) {
  if (method==='create_session') return true;
  if (!session) return false;
  if (method==='join_session') return session.status==='OPEN' && session.participants<3 && !role;
  if (method==='update_preference') return session.status==='OPEN' && !!role;
  if (method==='lock_session') return session.status==='OPEN' && session.participants===3 && role===1;
  if (method==='evaluate_allocations') return session.status==='LOCKED' && role===1;
  if (method==='ratify_proposal') return session.status==='PROPOSED' && !!role && !participant?.approved_current_round;
  if (method==='reject_proposal') return session.status==='PROPOSED' && Number(session.approvals)<3 && !!role;
  if (method==='finalize_session') return session.status==='PROPOSED' && Number(session.approvals)===3 && !!role && round?.status==='PROPOSED';
  if (method==='open_revision') return session.status==='REJECTED' && role===1 && Number(session.round)<2;
  return false;
}
export function normalizeRecord(value,label) {
  let unwrapped = value;
  if (typeof unwrapped==='string') {
    try { unwrapped=JSON.parse(unwrapped); } catch {throw new Error(`${label} returned invalid JSON`);}
  }
  if (!unwrapped || typeof unwrapped!=='object' || Array.isArray(unwrapped)) throw new Error(`${label} returned unexpected state`);
  return unwrapped;
}
export function formatWei(wei) {
  try { const n=BigInt(wei);const value=Number(n)/1e18;return value.toLocaleString('en-US',{maximumFractionDigits:9})+' GEN'; }
  catch {return String(wei)+' wei';}
}
export const shortAddress = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—';
export const friendlyError = (error) => {
  const m=error instanceof Error ? error.message : String(error);
  if (/user rejected|user denied|4001/i.test(m)) return 'Wallet signature was rejected. No new submission was confirmed.';
  return m.length>340?m.slice(0,340)+'…':m;
};
