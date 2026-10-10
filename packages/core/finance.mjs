import {assert} from './validation.mjs';
import {createHmac,timingSafeEqual} from 'node:crypto';
export function cents(value){assert(typeof value==='string'&&/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value),'invalid_amount','Enter a positive dollar amount with at most two decimal places.');const [d,f='']=value.split('.');const n=BigInt(d)*100n+BigInt(f.padEnd(2,'0'));assert(n>0n&&n<=100000000n,'invalid_amount','Amount is outside the application input range.');return Number(n);}
export function attestations(value){for(const key of ['eligibleResidency','ownFunds','age18','notFederalContractor','personalCreditCard'])assert(value?.[key]===true,'eligibility','Review and affirm all campaign eligibility requirements.');return true;}
export function verifySignature(raw,signature,secret){if(!secret||!Buffer.isBuffer(raw)||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;const expected=createHmac('sha256',secret).update(raw).digest();const actual=Buffer.from(signature,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function releaseDecision(config,now=new Date()){
 const reasons=[];if(config.enabled!==true)reasons.push('Fundraising is disabled.');
 for(const k of ['processorAccount','treasurerApproval','electionRules','processorContract','securityReview','reconciliationTest'])if(!config.evidence?.[k]?.reference||config.evidence[k].accepted!==true)reasons.push(`Missing accepted ${k} evidence.`);
 if(!config.evidence?.validUntil||Date.parse(config.evidence.validUntil)<=+now||!Number.isFinite(Date.parse(config.evidence.validUntil)))reasons.push('Release evidence is missing or expired.');
 return {allowed:reasons.length===0,reasons};
}
