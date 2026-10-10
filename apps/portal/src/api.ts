export class ApiError extends Error {constructor(public code:string,message:string,public status:number){super(message);}}
export async function request<T>(path:string,body?:unknown,csrf?:string,signal?:AbortSignal):Promise<T>{
 const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal});
 const result=await response.json();if(!response.ok)throw new ApiError(result.error||'request_failed',result.message||'Please try again.',response.status);return result;
}
