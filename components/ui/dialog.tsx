import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal(props: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function DialogPopup({
  className,
  children,
  showClose = true,
  ...props
}: DialogPrimitive.Popup.Props & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPrimitive.Popup
        data-slot="dialog-popup"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white shadow-lg outline-none",
          "data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:text-zinc-600"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-bold text-zinc-900", className)}
      {...props}
    />
  )
}

export { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle }
