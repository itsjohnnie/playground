import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'border border-border bg-transparent text-muted-foreground',
        gold: 'border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] text-[#D4AF37]',
        malas: 'border border-[rgba(220,112,112,0.4)] bg-[rgba(220,112,112,0.1)] text-[#dc7070]',
        buenas: 'border border-[rgba(112,192,128,0.4)] bg-[rgba(112,192,128,0.1)] text-[#70c080]',
        muted: 'bg-white/5 text-muted-foreground border border-white/8',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
