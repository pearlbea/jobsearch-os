import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { bandStyles, type ScoreBand } from "@/lib/score-band"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        low: "",
        medium: "",
        high: "",
        neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function isScoreBand(variant: string | null | undefined): variant is ScoreBand {
  return variant === "low" || variant === "medium" || variant === "high"
}

function Badge({
  className,
  variant,
  style,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  // low/medium/high get their color from bandStyles (lib/score-band.ts) so
  // a band renders identically here and everywhere else it appears.
  const band = isScoreBand(variant) ? bandStyles[variant] : undefined

  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      style={
        band
          ? {
              background: band.badgeBg,
              color: band.badgeColor,
              borderColor: `${band.badgeColor}33`,
              ...style,
            }
          : style
      }
      {...props}
    />
  )
}

export { Badge, badgeVariants }
