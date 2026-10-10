import {describe,it,expect} from 'vitest'
import {chatNotices} from '@/lib/notifications'
const buyer={conversation_id:'thread',latest_message_id:'m1',last_message_timestamp:1791648000,to_id:10,to_name:'Pembeli',unread_count:0,latest_message_from_id:10}
describe('ERP notification source semantics',()=>{
 it('includes unanswered chat independently of buyer read status and deduplicates polling',()=>{
   const result=chatNotices('s1','Toko A',[buyer,buyer])
   expect(result).toHaveLength(1)
   expect(result[0].title).toContain('Belum dibalas')
   expect(result[0].href).toBe('/chat?toko=s1&percakapan=thread')
 })
 it('removes replied/read chat, preserves unread chat, and gives a new message a new key',()=>{
   expect(chatNotices('s1','A',[{...buyer,needs_reply:false}])).toEqual([])
   expect(chatNotices('s1','A',[{...buyer,needs_reply:false,unread_count:2}])[0].title).toContain('belum dibaca')
   expect(chatNotices('s1','A',[{...buyer,latest_message_id:'m2'}])[0].key).not.toBe(chatNotices('s1','A',[buyer])[0].key)
 })
 it('does not infer reply requirements when provider state is unavailable; isolates shops',()=>{
   expect(chatNotices('s1','A',[{...buyer,latest_message_from_id:undefined}])).toEqual([])
   expect(chatNotices('s1','A',[buyer])[0].key).not.toBe(chatNotices('s2','B',[buyer])[0].key)
 })
})
