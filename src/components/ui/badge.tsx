import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:      "border-transparent bg-primary/15 text-primary hover:bg-primary/25",
        secondary:    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:  "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline:      "text-foreground border-border",
        // Status variants
        success:      "border-emerald-500/25 bg-emerald-500/15 text-emerald-400",
        warning:      "border-amber-500/25 bg-amber-500/15 text-amber-400",
        danger:       "border-red-500/25 bg-red-500/15 text-red-400",
        info:         "border-blue-500/25 bg-blue-500/15 text-blue-400",
        // Named status
        active:       "border-emerald-500/25 bg-emerald-500/15 text-emerald-400",
        approved:     "border-blue-500/25 bg-blue-500/15 text-blue-400",
        rejected:     "border-red-500/25 bg-red-500/15 text-red-400",
        under_review: "border-amber-500/25 bg-amber-500/15 text-amber-400",
        pending:      "border-slate-500/25 bg-slate-500/15 text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
