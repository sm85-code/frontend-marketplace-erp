import { useEffect, useRef, type CSSProperties, type ComponentProps } from 'react'
import { Toaster as Sonner, toast, useSonner } from 'sonner'
import { CircleCheck, CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function Toaster(props: ComponentProps<typeof Sonner>) {
  const { mode } = useTheme()
  const { toasts } = useSonner()
  const active = useRef(toasts)
  useEffect(() => { active.current = toasts }, [toasts])
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      // Let toast buttons/links perform their own action. Clicking elsewhere only dismisses feedback.
      if (target.closest('[data-sonner-toast] button, [data-sonner-toast] a, [data-sonner-toast] input')) return
      for (const item of active.current) {
        if (item.type === 'loading' || item.dismissible === false) continue
        toast.dismiss(item.id)
      }
    }
    document.addEventListener('pointerdown', dismiss, true)
    return () => document.removeEventListener('pointerdown', dismiss, true)
  }, [])
  return <Sonner
    {...props}
    containerAriaLabel="Pemberitahuan hasil"
    theme={mode}
    className="toaster erp-feedback group"
    position="top-center"
    duration={6000}
    offset="40vh"
    mobileOffset={{ top: '40vh', left: 48, right: 48 }}
    visibleToasts={3}
    style={{ '--width': 'min(440px, calc(100vw - 24px))' } as CSSProperties}
    richColors={false}
    icons={{ success: <CircleCheck className="size-5" />, error: <CircleAlert className="size-5" />, info: <Info className="size-5" />, warning: <TriangleAlert className="size-5" /> }}
    toastOptions={{ closeButtonAriaLabel: 'Tutup pemberitahuan', classNames: { toast: 'erp-feedback-card', title: 'erp-feedback-title', description: 'erp-feedback-description' } }}
  />
}
