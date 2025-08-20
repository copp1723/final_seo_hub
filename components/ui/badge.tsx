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
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm border",
        {
          "border-brand-medium/30 bg-gradient-to-r from-brand-light/30 to-brand-light/50 text-brand-dark hover:from-brand-light/50 hover:to-brand-light/70 shadow-sm":
            variant === "default",
          "border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 hover:from-slate-100 hover:to-slate-200 shadow-sm":
            variant === "secondary",
          "border-red-200/60 bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 shadow-sm":
            variant === "destructive",
          "border-slate-300/60 bg-white/80 text-slate-600 hover:bg-slate-50/80 shadow-sm": 
            variant === "outline",
          "border-blue-200/60 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 shadow-sm":
            variant === "info",
          "border-orange-200/60 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200 shadow-sm":
            variant === "warning",
          "border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 shadow-sm":
            variant === "success",
          "border-rose-200/60 bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 hover:from-rose-100 hover:to-rose-200 shadow-sm":
            variant === "error"
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
