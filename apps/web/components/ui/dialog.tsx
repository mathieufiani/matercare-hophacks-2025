"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/** Context to share dialog state with subcomponents */
type DialogCtx = {
  open: boolean
  setOpen: (v: boolean) => void
  labelledBy?: string
  describedBy?: string
}
const DialogContext = React.createContext<DialogCtx | null>(null)
const useDialogCtx = () => {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog subcomponent must be used within <Dialog>")
  return ctx
}

export type DialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/** Root */
export const Dialog: React.FC<DialogProps> = ({ open, defaultOpen, onOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(!!defaultOpen)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? !!open : uncontrolledOpen

  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setUncontrolledOpen(v)
      onOpenChange?.(v)
    },
    [isControlled, onOpenChange]
  )

  const [labelledBy, setLabelledBy] = React.useState<string | undefined>()
  const [describedBy, setDescribedBy] = React.useState<string | undefined>()

  const ctx: DialogCtx = React.useMemo(
    () => ({ open: actualOpen, setOpen, labelledBy, describedBy }),
    [actualOpen, setOpen, labelledBy, describedBy]
  )

  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>
}

/** Trigger (optional asChild clone, widened onClick typing) */
export const DialogTrigger: React.FC<
  Omit<React.ComponentPropsWithoutRef<"button">, "onClick"> & {
    asChild?: boolean
    onClick?: (e: React.MouseEvent<any>) => void
  }
> = ({ asChild, onClick, ...props }) => {
  const { setOpen } = useDialogCtx()

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children as React.ReactElement, {
      onClick: (e: React.MouseEvent<any>) => {
        ;(props.children as any).props?.onClick?.(e)
        setOpen(true)
        onClick?.(e)
      },
    })
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        setOpen(true)
        onClick?.(e)
      }}
      {...props}
    />
  )
}

/** Portal */
export const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return null
  return createPortal(children, document.body)
}

/** Overlay */
export const DialogOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => {
    const { open } = useDialogCtx()
    if (!open) return null
    return (
      <DialogPortal>
        <div
          ref={ref}
          className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
          )}
          data-state="open"
          {...props}
        />
      </DialogPortal>
    )
  }
)
DialogOverlay.displayName = "DialogOverlay"

/** Content */
export type DialogContentProps = React.ComponentPropsWithoutRef<"div"> & {
  closeOnOutsideClick?: boolean
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, closeOnOutsideClick = true, ...props }, ref) => {
    const { open, setOpen, labelledBy, describedBy } = useDialogCtx()
    const contentRef = React.useRef<HTMLDivElement>(null)
    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement)

    // ESC to close
    React.useEffect(() => {
      if (!open) return
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false)
      }
      document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    }, [open, setOpen])

    // Focus content on open
    React.useEffect(() => {
      if (open) contentRef.current?.focus()
    }, [open])

    if (!open) return null

    const handleOverlayClick = () => {
      if (closeOnOutsideClick) setOpen(false)
    }

    const stop = (e: React.MouseEvent) => e.stopPropagation()

    return (
      <DialogPortal>
        {/* Overlay */}
        <div
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          data-state="open"
          onClick={handleOverlayClick}
        />
        {/* Content */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          ref={contentRef}
          onClick={stop}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4",
            "border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
          data-state="open"
          {...props}
        >
          {children}
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = "DialogContent"

/** Close */
export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useDialogCtx()
  return (
    <button
      ref={ref}
      type="button"
      className={cn(className)}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    />
  )
})
DialogClose.displayName = "DialogClose"

/** Header / Footer */
export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

/** Title wires up aria-labelledby */
export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, id, ...props }, ref) => {
    const ctx = React.useContext(DialogContext)!
    const localId = React.useId()
    const finalId = id ?? localId
    React.useEffect(() => {
      if (!ctx.labelledBy) (ctx as any).labelledBy = finalId
    }, [ctx, finalId])
    return (
      <h2
        ref={ref}
        id={finalId}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    )
  }
)
DialogTitle.displayName = "DialogTitle"

/** Description wires up aria-describedby */
export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, id, ...props }, ref) => {
  const ctx = React.useContext(DialogContext)!
  const localId = React.useId()
  const finalId = id ?? localId
  React.useEffect(() => {
    if (!ctx.describedBy) (ctx as any).describedBy = finalId
  }, [ctx, finalId])
  return (
    <p ref={ref} id={finalId} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
})
DialogDescription.displayName = "DialogDescription"