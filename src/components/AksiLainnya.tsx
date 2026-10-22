import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
export default function AksiLainnya({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="outline" className={className} aria-label="Aksi lainnya" title="Aksi lainnya">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-64 flex-col gap-2 [&_button]:justify-start"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
