import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { bandStyles } from "@/lib/score-band"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        // Band colors come from bandStyles (lib/score-band.ts) so a band
        // renders identically here and everywhere else it appears.
        poor: bandStyles.poor.badgeClassName,
        stretch: bandStyles.stretch.badgeClassName,
        good: bandStyles.good.badgeClassName,
        strong: bandStyles.strong.badgeClassName,
        neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
