import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Bot, ChevronDown, EyeOff } from 'lucide-react'
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
  const [position,setPosition]=useState<{x:number;y:number}|null>(null)
  const drag=useRef<{x:number;y:number;left:number;top:number;moved:boolean}|null>(null)
  const suppressClick=useRef(false)
  useEffect(()=>{
    const clamp=()=>setPosition(old=>old ? {x:Math.max(8,Math.min(old.x,window.innerWidth-88)),y:Math.max(8,Math.min(old.y,window.innerHeight-144))} : null)
    window.addEventListener('resize',clamp)
    return()=>window.removeEventListener('resize',clamp)
  },[])
  useEffect(()=>{
    if(!open || pathname==='/asisten' || !window.matchMedia('(max-width: 639px)').matches)return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return()=>{document.body.style.overflow=previous}
  },[open,pathname])
  const trigger=useRef<HTMLButtonElement>(null)
  const visible=open && pathname!=='/asisten'
  useEffect(()=>{const restore=()=>setHidden(false);window.addEventListener('erp-restore-ai',restore);return()=>window.removeEventListener('erp-restore-ai',restore)},[])
  function minimize(){setOpen(false);trigger.current?.focus()}
  return <>
    <div className={`fixed right-4 bottom-24 z-40 pointer-events-none lg:bottom-6 ${position?'max-sm:left-[var(--ai-x)] max-sm:top-[var(--ai-y)] max-sm:right-auto max-sm:bottom-auto':''} ${hidden||visible||pathname==='/asisten'?'hidden':'block'}`} style={position ? {'--ai-x':`${position.x}px`,'--ai-y':`${position.y}px`} as CSSProperties : undefined}>
      <Button ref={trigger} className="pointer-events-auto touch-none rounded-full shadow-lg"
        onPointerDown={e=>{
          if(window.matchMedia('(min-width: 640px)').matches)return
          const rect=e.currentTarget.getBoundingClientRect()
          drag.current={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,moved:false}
          suppressClick.current=false
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={e=>{
          const start=drag.current;if(!start)return
          const dx=e.clientX-start.x,dy=e.clientY-start.y
          if(Math.hypot(dx,dy)>6)start.moved=true
          if(start.moved)setPosition({x:Math.max(8,Math.min(start.left+dx,window.innerWidth-e.currentTarget.offsetWidth-8)),y:Math.max(8,Math.min(start.top+dy,window.innerHeight-e.currentTarget.offsetHeight-88))})
        }}
        onPointerUp={()=>{suppressClick.current=!!drag.current?.moved;drag.current=null}}
        onPointerCancel={()=>{drag.current=null;suppressClick.current=true}} aria-label="Buka AI asisten" aria-expanded={visible} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return}setMounted(true);setOpen(true)}}><Bot className="size-5"/><span>AI</span></Button>
    </div>
    {mounted && <section hidden={!visible} role="region" aria-label="Panel AI asisten" onKeyDown={e=>{if(e.key==='Escape')minimize()}} className={`fixed inset-0 z-50 ${visible?'flex':'hidden'} flex-col overflow-hidden bg-background shadow-xl sm:inset-x-2 sm:top-20 sm:bottom-24 sm:rounded-2xl sm:border sm:left-auto sm:w-[min(36rem,calc(100vw-1rem))] lg:top-4 lg:right-4 lg:bottom-4`}>
      <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 pt-[max(.5rem,env(safe-area-inset-top))] pb-2"><span className="flex items-center gap-2 font-semibold"><Bot className="size-4"/>Asisten AI</span><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Sembunyikan tombol AI" onClick={()=>{setHidden(true);setOpen(false)}}><EyeOff className="size-4"/></Button><Button variant="ghost" size="icon" aria-label="Minimalkan AI asisten" onClick={minimize}><ChevronDown className="size-4"/></Button></div></header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"><Suspense fallback={<Spinner column/>}><AssistantPage embedded/></Suspense></div>
    </section>}
  </>
}
