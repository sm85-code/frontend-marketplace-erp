import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-soft hover:brightness-90',
        outline:
          'border-primary bg-primary text-primary-foreground shadow-sm hover:brightness-90',
        secondary:
          'border-primary/30 bg-primary/20 text-foreground shadow-sm hover:bg-primary/30',
        ghost:
          'border-primary/25 bg-primary/10 text-foreground hover:bg-primary/20',
        destructive:
          'bg-destructive/10 text-[color-mix(in_oklab,var(--destructive)_70%,black)] hover:bg-destructive/20 dark:text-[color-mix(in_oklab,var(--destructive)_65%,white)]',
        link: 'border-primary/30 bg-primary/15 text-foreground underline underline-offset-4 hover:bg-primary/25',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 rounded-md px-2.5 text-sm',
        lg: 'h-10 px-3.5',
        icon: 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
