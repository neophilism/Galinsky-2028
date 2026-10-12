import {randomInt} from 'node:crypto';

export const GATEWAY_SYSTEM_SIGNALS = Object.freeze(['gateway_error','gateway_timeout','processor_unavailable']);
export const AVAILABILITY_SYSTEM_SIGNALS = Object.freeze(['checkout_unreachable']);
export const SYSTEM_SIGNALS = Object.freeze([...GATEWAY_SYSTEM_SIGNALS,...AVAILABILITY_SYSTEM_SIGNALS]);
export const FATAL_SIGNALS = Object.freeze(['access_terminated','credentials_revoked','merchant_suspended']);
export const BENIGN_SIGNALS = Object.freeze(['donor_decline','donor_cancelled']);
export const HEALTH_SIGNALS = Object.freeze(['verified_success','checkout_reachable',...SYSTEM_SIGNALS,...FATAL_SIGNALS,...BENIGN_SIGNALS]);
export const INCIDENT_WINDOW_MS = 10 * 60 * 1000;
export const INCIDENT_THRESHOLD = 3;

export function selectRotatingProvider(routes,states,draw=randomInt) {
 if (!Array.isArray(routes) || routes.length !== 4) throw new Error('Exactly four independently approved processor configurations are required.');
 if (!Array.isArray(states)) throw new Error('Provider status evidence is unavailable.');
 const byId = new Map(states.map(row=>[row.provider_id,row.status]));
 const available = routes.filter(route=>byId.get(route.id)==='active');
 if (!available.length) return null;
 const index=draw(available.length);
 if (!Number.isSafeInteger(index)||index<0||index>=available.length)throw new Error('Invalid random processor selection');
 return available[index];
}

// Only independently authenticated, operator/provider-verified signals belong here.
// Ordinary donor declines and abandoned checkouts NEVER imply a processor outage.
// A fatal provider denial quarantines immediately; discrimination is NOT auto-inferred.
export function evaluateIncident(observations, now=Date.now()) {
 if (!Array.isArray(observations)) throw new Error('Verified observation history is required');
 const relevant=observations.filter(event=>
  HEALTH_SIGNALS.includes(event.signal) && Number.isFinite(+new Date(event.observed_at)) &&
  now-(+new Date(event.observed_at)) >= 0 && now-(+new Date(event.observed_at)) <= INCIDENT_WINDOW_MS
 );
 if (relevant.some(event=>FATAL_SIGNALS.includes(event.signal)))
  return {quarantine:true,reason:'hard_provider_denial'};
 // A reachable checkout page only clears a *reachability* streak. It is
 // never proof that its bank is authorizing or settling campaign charges.
 function repeatedFailures(failureSignals,recoverySignals) {
  const recent=relevant.filter(event=>failureSignals.includes(event.signal)||recoverySignals.includes(event.signal)).slice(0,INCIDENT_THRESHOLD);
  return recent.length===INCIDENT_THRESHOLD &&
   recent.every(event=>failureSignals.includes(event.signal)) &&
   new Set(recent.map(event=>event.attempt_ref)).size===INCIDENT_THRESHOLD;
 }
 if(repeatedFailures(GATEWAY_SYSTEM_SIGNALS,['verified_success']))
  return {quarantine:true,reason:'repeated_systemic_failure'};
 if(repeatedFailures(AVAILABILITY_SYSTEM_SIGNALS,['checkout_reachable']))
  return {quarantine:true,reason:'repeated_checkout_outage'};
 return {quarantine:false,reason:null};
}
