// Renderer and API share a strict, non-secret Git revision indicator.
export function safeReleaseCommit(value){
 return typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)?value.toLowerCase():null;
}
