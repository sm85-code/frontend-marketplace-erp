/** The private source stays encrypted in public build assets; the key is only in the admin's private link. */
export async function readProcessingCapsule(key:string):Promise<unknown> {
  if(!/^[A-Za-z0-9_-]{43}$/.test(key))throw new Error('Tautan data Drive tidak valid')
  const {default:capsule}=await import('@/data/processingDriveCapsule.json')
  const bytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0))
  const secret=await crypto.subtle.importKey('raw',bytes(key.replace(/-/g,'+').replace(/_/g,'/')+'='),'AES-GCM',false,['decrypt'])
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(capsule.nonce),additionalData:new TextEncoder().encode('processing-drive-v1')},secret,bytes(capsule.ciphertext))
  return JSON.parse(new TextDecoder().decode(plain))
}
