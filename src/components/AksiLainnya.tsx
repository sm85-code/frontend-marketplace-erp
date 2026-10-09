import type { ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
export default function AksiLainnya({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          Aksi lainnya
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
