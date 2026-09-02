import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        outline: 'border border-border bg-transparent text-text hover:bg-code-bg hover:text-text-h',
        ghost: 'bg-transparent text-text hover:bg-code-bg hover:text-text-h',
        destructive: 'bg-error text-white hover:opacity-90',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-7 px-3 text-[13px]',
        icon: 'h-[26px] w-[26px] p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
