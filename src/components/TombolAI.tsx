import { Bot } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

/** AI assistant button in the app header (replaces the floating button that covered page content). */
export default function TombolAI() {
  const { user, bisa } = useAuth()
  const { pathname } = useLocation()
  if (!user || !bisa('asisten') || user.must_change_password || pathname === '/asisten') return null
  return (
    <Button type="button" variant="ghost" size="icon" aria-label="Buka AI asisten" title="Asisten AI" onClick={() => window.dispatchEvent(new Event('erp-open-ai'))}>
      <Bot className="size-5" aria-hidden="true" />
    </Button>
  )
}
