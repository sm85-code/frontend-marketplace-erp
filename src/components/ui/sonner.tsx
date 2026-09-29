import type { ComponentProps } from 'react'
import { Toaster as Sonner } from 'sonner'

export function Toaster(props: ComponentProps<typeof Sonner>) {
  return <Sonner theme="light" className="toaster group" position="top-right" richColors closeButton {...props} />
}
