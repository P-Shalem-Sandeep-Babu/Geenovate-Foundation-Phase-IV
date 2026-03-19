import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className ?? ""}`}>
      {Icon && (
        <div className="mb-5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <Icon className="h-7 w-7 text-muted-foreground/40" />
        </div>
      )}
      <h3 className="font-semibold text-foreground/80 text-sm mb-1.5 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  );
}
