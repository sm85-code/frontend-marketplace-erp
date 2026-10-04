import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-[color-mix(in_oklab,var(--primary)_65%,black)] dark:text-[color-mix(in_oklab,var(--primary)_65%,white)]',
        secondary: 'bg-muted text-foreground',
        outline: 'border border-border text-foreground',
        destructive: 'bg-destructive/15 text-[color-mix(in_oklab,var(--destructive)_65%,black)] dark:text-[color-mix(in_oklab,var(--destructive)_65%,white)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
