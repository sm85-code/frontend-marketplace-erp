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
          'border-blue-700 bg-blue-700 text-white shadow-sm hover:bg-blue-800 dark:border-blue-400 dark:bg-blue-600 dark:hover:bg-blue-500',
        secondary:
          'border-slate-300 bg-slate-200 text-slate-950 shadow-sm hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600',
        ghost:
          'border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700',
        destructive:
          'bg-destructive/10 text-[color-mix(in_oklab,var(--destructive)_70%,black)] hover:bg-destructive/20 dark:text-[color-mix(in_oklab,var(--destructive)_65%,white)]',
        link: 'border-blue-200 bg-blue-50 text-blue-800 underline underline-offset-4 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900',
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
