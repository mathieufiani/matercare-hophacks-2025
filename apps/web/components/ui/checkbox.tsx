"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "checked"
> & {
  checked?: boolean
  /** Called with boolean (true/false). */
  onCheckedChange?: (checked: boolean) => void
  /** Visual indeterminate state. */
  indeterminate?: boolean
}

/**
 * 100% custom checkbox (no Radix).
 * Accessible, controlled, supports indeterminate.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, indeterminate, id, disabled, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

    // Reflect indeterminate state on the native input
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = !!indeterminate && !checked
      }
    }, [indeterminate, checked])

    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex items-center gap-2 select-none",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "relative flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
            "ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            checked ? "bg-primary text-primary-foreground" : "bg-background",
            className
          )}
        >
          <input
            id={id}
            ref={internalRef}
            type="checkbox"
            className={cn(
              "peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-sm"
            )}
            aria-checked={indeterminate ? "mixed" : checked}
            checked={!!checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            {...props}
          />
          {/* Icon layer */}
          <span
            className={cn(
              "pointer-events-none flex items-center justify-center text-current transition-opacity",
              checked || indeterminate ? "opacity-100" : "opacity-0"
            )}
          >
            {indeterminate ? (
              <span className="block h-0.5 w-3 bg-current" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </span>
        </span>
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"