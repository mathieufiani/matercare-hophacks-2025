"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  /** Controlled state */
  checked?: boolean
  /** Called with the next boolean state */
  onCheckedChange?: (checked: boolean) => void
  /** Link to a label's htmlFor */
  id?: string
}

/**
 * 100% custom switch (no Radix).
 * Accessible via role="switch" and keyboard (Space/Enter).
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, id, ...props }, ref) => {
    const toggle = React.useCallback(() => {
      if (disabled) return
      onCheckedChange?.(!checked)
    }, [checked, disabled, onCheckedChange])

    return (
      <button
        id={id}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        data-state={checked ? "checked" : "unchecked"}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            toggle()
          }
        }}
        className={cn(
          // track
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-input",
          className
        )}
        {...props}
      >
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"