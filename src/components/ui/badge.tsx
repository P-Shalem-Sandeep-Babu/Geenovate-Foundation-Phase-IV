import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline: "text-foreground border-white/10",
        success: "border-transparent bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        warning: "border-transparent bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
