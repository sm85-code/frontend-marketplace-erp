import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowLeft, Bot, Maximize2, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import Spinner from './Spinner'
import AiUsageBadge from './AiUsageBadge'
import { Button } from './ui/button'
import { useNamaMenu } from '@/lib/namaMenu'
const AssistantPage=lazy(()=>import('@/pages/AssistantPage'))

/** Mounted outside Routes: navigation and minimization preserve the draft and active conversation. */
export default function WorkspaceOverlays() {
  const {user,bisa}=useAuth()
  const {pathname}=useLocation()
  return user && bisa('asisten') && !user.must_change_password && !pathname.startsWith('/login') && !pathname.startsWith('/oauth/') ? <FloatingAssistant key={user.id}/> : null
}
function FloatingAssistant() {
  const {pathname}=useLocation()
  const menu = useNamaMenu()
  const [open,setOpen]=useState(false)
  const [mounted,setMounted]=useState(false)
  const visible=open && pathname!=='/asisten'
  // A link inside the panel (e.g. "Buka draf") opens another page: close the panel so the page is visible.
  const [lastPath,setLastPath]=useState(pathname)
  if(lastPath!==pathname){setLastPath(pathname);if(open)setOpen(false)}
  useEffect(()=>{const buka=()=>{setMounted(true);setOpen(true)};window.addEventListener('erp-open-ai',buka);return()=>window.removeEventListener('erp-open-ai',buka)},[])
  // Phone: lock page scroll behind the full-screen panel.
  useEffect(()=>{
    if(!visible || !window.matchMedia('(max-width: 639px)').matches)return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return()=>{document.body.style.overflow=previous}
  },[visible])
  // PWA has no browser back button: the Android back gesture closes the panel instead of leaving the page.
  useEffect(()=>{
    if(!visible)return
    if(!(window.history.state as {aiTerbuka?:boolean}|null)?.aiTerbuka) window.history.pushState({...(window.history.state??{}),aiTerbuka:true},'')
    const kembali=()=>setOpen(false)
    window.addEventListener('popstate',kembali)
    return()=>window.removeEventListener('popstate',kembali)
  },[visible])
  function tutup(){
    if((window.history.state as {aiTerbuka?:boolean}|null)?.aiTerbuka) window.history.back()
    setOpen(false)
  }
  return mounted ? <section hidden={!visible} role="dialog" aria-label="Panel AI asisten" onKeyDown={e=>{if(e.key==='Escape')tutup()}} className={`fixed inset-0 z-50 ${visible?'flex':'hidden'} flex-col overflow-hidden bg-background shadow-xl sm:inset-x-2 sm:top-20 sm:bottom-24 sm:rounded-2xl sm:border sm:left-auto sm:w-[min(36rem,calc(100vw-1rem))] lg:top-4 lg:right-4 lg:bottom-4`}>
    <header className="flex shrink-0 items-center gap-1 border-b bg-card px-2 pt-[max(.5rem,env(safe-area-inset-top))] pb-2">
      <Button variant="ghost" size="icon" className="size-11 sm:hidden" aria-label="Kembali" onClick={tutup}><ArrowLeft className="size-5"/></Button>
      <span className="flex min-w-0 flex-1 items-center gap-2 px-2 font-semibold"><Bot className="size-4 shrink-0"/><span className="truncate">{menu('/asisten')}</span></span><AiUsageBadge/>
      <Button variant="ghost" size="icon" asChild aria-label="Buka layar penuh" title="Buka layar penuh"><Link to="/asisten" onClick={()=>setOpen(false)}><Maximize2 className="size-4"/></Link></Button>
      <Button variant="ghost" size="icon" className="size-11" aria-label="Tutup AI asisten" onClick={tutup}><X className="size-5"/></Button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"><Suspense fallback={<Spinner column/>}><AssistantPage embedded/></Suspense></div>
  </section> : null
}
