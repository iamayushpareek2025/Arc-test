import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer";

    const variants = {
      default:
        "bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-[0.98] shadow-md shadow-emerald-500/20 font-semibold",
      secondary:
        "bg-slate-800 text-slate-100 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60",
      outline:
        "border border-slate-700 text-slate-200 hover:bg-slate-800/80 active:scale-[0.98]",
      ghost:
        "text-slate-300 hover:bg-slate-800/50 hover:text-white",
      danger:
        "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs gap-1.5",
      md: "h-11 px-5 text-sm gap-2",
      lg: "h-13 px-7 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
