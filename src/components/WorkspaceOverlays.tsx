import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, EyeOff, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import Spinner from './Spinner'
import { Button } from './ui/button'
const AssistantPage=lazy(()=>import('@/pages/AssistantPage'))

/** Mounted outside Routes: navigation and minimization preserve the draft and active conversation. */
export default function WorkspaceOverlays() {
  const {user}=useAuth()
  const {pathname}=useLocation()
  return user?.role==='admin' && !user.must_change_password && !pathname.startsWith('/login') && !pathname.startsWith('/oauth/') ? <FloatingAssistant key={user.id}/> : null
}
function FloatingAssistant() {
  const {pathname}=useLocation()
  const [open,setOpen]=useState(false)
  const [mounted,setMounted]=useState(false)
  const [hidden,setHidden]=useState(false)
  const trigger=useRef<HTMLButtonElement>(null)
  const visible=open && pathname!=='/asisten'
  useEffect(()=>{const restore=()=>setHidden(false);window.addEventListener('erp-restore-ai',restore);return()=>window.removeEventListener('erp-restore-ai',restore)},[])
  function minimize(){setOpen(false);trigger.current?.focus()}
  return <>
    <div className={`fixed right-4 bottom-24 z-40 lg:bottom-6 ${hidden||pathname==='/asisten'?'hidden':'block'}`}>
      <Button ref={trigger} className="rounded-full shadow-lg" aria-label="Buka AI asisten" aria-expanded={visible} onClick={()=>{setMounted(true);setOpen(true)}}><Bot className="size-5"/><span>AI</span></Button>
    </div>
    {mounted && <section hidden={!visible} role="region" aria-label="Panel AI asisten" onKeyDown={e=>{if(e.key==='Escape')minimize()}} className={`fixed inset-x-2 top-20 bottom-24 z-50 ${visible?'flex':'hidden'} flex-col overflow-hidden rounded-2xl border bg-background shadow-xl sm:left-auto sm:w-[min(36rem,calc(100vw-1rem))] lg:top-4 lg:right-4 lg:bottom-4`}>
      <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2"><span className="flex items-center gap-2 font-semibold"><Bot className="size-4"/>Asisten AI</span><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Sembunyikan tombol AI" onClick={()=>{setHidden(true);setOpen(false)}}><EyeOff className="size-4"/></Button><Button variant="ghost" size="icon" aria-label="Minimalkan AI asisten" onClick={minimize}><ChevronDown className="size-4"/></Button><Button variant="ghost" size="icon" aria-label="Tutup panel AI" onClick={minimize}><X className="size-4"/></Button></div></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3"><Suspense fallback={<Spinner column/>}><AssistantPage embedded/></Suspense></div>
    </section>}
  </>
}
