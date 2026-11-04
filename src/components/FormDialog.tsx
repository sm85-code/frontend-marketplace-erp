import { useEffect, useRef, type ReactNode } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ConfirmProvider'
import { useBolehTulis } from '@/lib/modeTulis'

/** User dismissal is guarded; closing after a successful save remains controlled by the caller. */
export default function FormDialog({
  open,
  onOpenChange,
  values,
  busy = false,
  boleh,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: unknown
  busy?: boolean
  /** Whether the form may be used; defaults to the page's Tulis access. A form of a role with only Baca never opens. */
  boleh?: boolean
  children: ReactNode
}) {
  const confirm = useConfirm()
  const halamanTulis = useBolehTulis()
  const bolehIsi = boleh ?? halamanTulis
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
      open={open && bolehIsi}
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
