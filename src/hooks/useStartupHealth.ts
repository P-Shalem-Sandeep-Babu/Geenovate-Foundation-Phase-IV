import { useMemo } from "react";

interface StartupHealthInput {
  totalTasks: number;
  completedTasks: number;
  stage: string | null;
  avgScore: number; // 0–10
}

const STAGES = ["idea", "validation", "prototype", "mvp", "scaling"];

export interface HealthResult {
  score: number;       // 0–100
  label: "Good" | "Moderate" | "Needs Attention";
  colorClass: string;
  bgClass: string;
  barColorClass: string;
}

export function useStartupHealth(input: StartupHealthInput): HealthResult {
  return useMemo(() => {
    const { totalTasks, completedTasks, stage, avgScore } = input;

    // Task completion %: 0–100 → weight 40%
    const taskPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Stage progress %: 0–100 → weight 30%
    const stageIdx = STAGES.indexOf(stage || "idea");
    const stagePct = stageIdx >= 0 ? (stageIdx / (STAGES.length - 1)) * 100 : 0;

    // Scorecard %: avgScore 0–10 → 0–100 → weight 30%
    const scorePct = avgScore > 0 ? (avgScore / 10) * 100 : 0;

    const health = Math.round(taskPct * 0.4 + stagePct * 0.3 + scorePct * 0.3);
    const score = Math.min(100, Math.max(0, health));

    if (score >= 65) {
      return {
        score,
        label: "Good",
        colorClass: "text-green-700 dark:text-green-400",
        bgClass: "bg-green-100 border-green-200 dark:bg-green-900/20",
        barColorClass: "bg-green-500",
      };
    } else if (score >= 35) {
      return {
        score,
        label: "Moderate",
        colorClass: "text-yellow-700 dark:text-yellow-400",
        bgClass: "bg-yellow-100 border-yellow-200 dark:bg-yellow-900/20",
        barColorClass: "bg-yellow-500",
      };
    } else {
      return {
        score,
        label: "Needs Attention",
        colorClass: "text-red-700 dark:text-red-400",
        bgClass: "bg-red-100 border-red-200 dark:bg-red-900/20",
        barColorClass: "bg-red-500",
      };
    }
  }, [input.totalTasks, input.completedTasks, input.stage, input.avgScore]);
}
