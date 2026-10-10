import {chatNeedsReply,chatTimestamp} from './chat'
export interface ChatNoticeSource {conversation_id:string;latest_message_id?:string;last_message_timestamp:number;to_id:number;to_name:string;unread_count:number;needs_reply?:boolean|null;latest_message_from_id?:string|number}
export interface ChatNotice {key:string;title:string;href:string;shopName:string;timestamp:number}
export function chatNotices(shopId:string,shopName:string,rows:ChatNoticeSource[]):ChatNotice[] {
  const notices=new Map<string,ChatNotice>()
  for(const row of rows){
    if(!row.conversation_id || (row.unread_count<=0 && chatNeedsReply(row)!==true))continue
    const key=`chat:${shopId}:${row.conversation_id}:${row.latest_message_id??row.last_message_timestamp}`
    if(key.length>255)continue
    notices.set(key,{key,title:`${row.to_name||'Pembeli'} · ${chatNeedsReply(row)===true?'Belum dibalas':'Chat belum dibaca'}`,href:`/chat?toko=${encodeURIComponent(shopId)}&percakapan=${encodeURIComponent(row.conversation_id)}`,shopName,timestamp:chatTimestamp(row.last_message_timestamp)})
  }
  return [...notices.values()].sort((a,b)=>b.timestamp-a.timestamp)
}
