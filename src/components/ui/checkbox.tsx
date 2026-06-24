"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (v: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, indeterminate, onCheckedChange, onChange, ...props }, ref) => {
    const inner = React.useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);
    React.useEffect(() => {
      if (inner.current) inner.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    return (
      <label className={cn("relative inline-flex h-4 w-4 cursor-pointer items-center justify-center", className)}>
        <input
          ref={inner}
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            onCheckedChange?.(e.target.checked);
            onChange?.(e);
          }}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border bg-background transition-colors",
            "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
            indeterminate && "border-primary bg-primary text-primary-foreground"
          )}
        >
          {(checked || indeterminate) && <Check className="h-3 w-3" />}
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
