// Read-only checkout PAGE reachability only. Never a payment authorization,
// merchant standing, donor eligibility or bank settlement health check.
const stripeHost = host => /(^|\.)(stripe\.com|stripe\.network|stripepayments\.com|stripe-cdn\.com)$/.test(host);
export async function probeHostedCheckout(url,{fetchImpl=fetch,timeoutMs=8000}={}){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||stripeHost(parsed.hostname)||!Number.isSafeInteger(timeoutMs)||timeoutMs<500||timeoutMs>30000)
  throw new Error('Invalid approved checkout probe configuration');
 let response;
 try{
  response=await fetchImpl(parsed.href,{method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
 }catch{
  return {signal:'checkout_unreachable',code:'network_or_timeout'};
 }
 if(!Number.isInteger(response?.status)||response.status<100||response.status>599)
  return {signal:null,code:'invalid_http_status'};
 const status=response.status;
 if(status>=300&&status<400){
  const target=response.headers?.get?.('location');
  // A redirect alone cannot establish that a payment checkout works.
  // Otherwise a merchant could redirect to an unrelated page, a captive
  // portal or a blocked platform and still count as "healthy".
  if(!target)return {signal:null,code:'redirect_without_destination'};
  try {
   const destination=new URL(target,parsed);
   if(destination.protocol!=='https:'||destination.username||destination.password||
      destination.port||destination.hostname!==parsed.hostname)
    return {signal:null,code:stripeHost(destination.hostname)?'prohibited_upstream':'external_redirect_unverified'};
  }catch{return {signal:null,code:'invalid_redirect'};}
  return {signal:null,code:'same_origin_redirect_unverified'};
 }
 if(status===204||status===205)return {signal:null,code:'no_checkout_content'};
 if(status>=200&&status<300)return {signal:'checkout_reachable',code:'http_ok'};
 if(status>=500||status===404||status===410)return {signal:'checkout_unreachable',code:'http_unavailable'};
 return {signal:null,code:'http_inconclusive'};
}
