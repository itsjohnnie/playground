import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'pressable inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-body font-medium select-none',
    'rounded-md',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-accent-hi shadow-1',
        outline: 'bg-transparent text-ink border border-ink/40 hover:border-ink/70',
        ghost:   'bg-transparent text-ink border border-line hover-elevate',
        soft:    'bg-surface-hi text-ink border border-line hover-elevate',
        danger:  'bg-transparent text-danger border border-danger/60 hover:border-danger',
        link:    'text-ink-muted underline underline-offset-4 hover:text-ink p-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-[0.95rem]',
        lg: 'h-12 px-5 text-base',
        xl: 'h-14 px-6 text-lg rounded-md',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref as never}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants }
