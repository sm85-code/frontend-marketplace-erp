import * as React from 'react'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      data-slot="table"
      className={cn('w-full caption-bottom text-[length:var(--teks-data)] leading-[1.35]', className)}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return <tfoot data-slot="table-footer" className={cn('border-t bg-muted/40 [&>tr]:border-b-0', className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b transition-colors hover:bg-muted/40', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-9 px-[var(--pad-sel-x)] text-left align-middle text-[length:var(--teks-judul)] font-semibold tracking-wider uppercase',
        'text-[color:var(--text-secondary)] [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-[var(--pad-sel-x)] py-[var(--pad-sel-y)] align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell }
