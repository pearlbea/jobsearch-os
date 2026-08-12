import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        low: "bg-red-50 text-red-700 border-red-200",
        medium: "bg-amber-50 text-amber-700 border-amber-200",
        high: "bg-green-50 text-green-700 border-green-200",
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
