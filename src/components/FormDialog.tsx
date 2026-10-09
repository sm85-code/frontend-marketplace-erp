import { useEffect, useRef, type ReactNode } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ConfirmProvider'

/** User dismissal is guarded; closing after a successful save remains controlled by the caller. */
export default function FormDialog({
  open,
  onOpenChange,
  values,
  busy = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: unknown
  busy?: boolean
  children: ReactNode
}) {
  const confirm = useConfirm()
  const initial = useRef('')
  const wasOpen = useRef(false)
  const asking = useRef(false)
  const snapshot = JSON.stringify(values)
  useEffect(() => {
    if (open && !wasOpen.current) initial.current = snapshot
    wasOpen.current = open
  }, [open, snapshot])
  useEffect(() => {
    if (!open || initial.current === snapshot) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [open, snapshot])
  async function change(next: boolean) {
    if (next) return onOpenChange(true)
    if (busy || asking.current) return
    if (initial.current !== snapshot) {
      asking.current = true
      const discard = await confirm({
        title: 'Buang perubahan?',
        description: 'Isian belum disimpan.',
        confirmLabel: 'Buang perubahan',
        cancelLabel: 'Lanjut mengisi',
        destructive: true,
      })
      asking.current = false
      if (!discard) return
    }
    onOpenChange(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        void change(next)
      }}
    >
      <div
        onClickCapture={(event) => {
          const button = (event.target as HTMLElement).closest('button')
          if (button?.textContent?.trim() === 'Batal') {
            event.preventDefault()
            event.stopPropagation()
            void change(false)
          }
        }}
      >
        {children}
      </div>
    </Dialog>
  )
}
