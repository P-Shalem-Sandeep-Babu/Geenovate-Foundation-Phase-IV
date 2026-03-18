import { useState } from "react";
import { Rocket, Lightbulb, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { icon: Lightbulb, color: "text-yellow-500 bg-yellow-100", title: "Submit an Idea", desc: "Got a startup concept? Submit it and our team will review it." },
  { icon: CheckCircle, color: "text-blue-500 bg-blue-100", title: "Get Reviewed", desc: "Mentors and admins give structured feedback and approve strong ideas." },
  { icon: Rocket, color: "text-green-500 bg-green-100", title: "Launch Your Startup", desc: "Approved ideas become startups. Get scored, funded, and tracked." },
];

const LS_KEY = "geenovate_onboarding_dismissed";

export function OnboardingBanner() {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(LS_KEY); } catch { return true; }
  });

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(LS_KEY, "1"); } catch {}
    setVisible(false);
  };

  return (
    <div className="mb-6 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">👋 Welcome to Geenovate Ascent</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{i + 1}. {s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-4" onClick={dismiss}>Got it, let's go →</Button>
    </div>
  );
}
