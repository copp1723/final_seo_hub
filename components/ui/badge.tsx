import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "info" | "warning" | "success" | "error"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80":
            variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80":
            variant === "destructive",
          "text-foreground": variant === "outline",
          "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200":
            variant === "info",
          "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200":
            variant === "warning",
          "border-transparent bg-green-100 text-green-800 hover:bg-green-200":
            variant === "success",
          "border-transparent bg-red-100 text-red-800 hover:bg-red-200":
            variant === "error"
        },
        className
      )}
      { ...props}
    />
  )
}

export { Badge }
