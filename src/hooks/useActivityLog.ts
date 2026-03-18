import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type EntityType = "idea" | "startup" | "task" | "pitch" | "score" | "funding";

export function useActivityLog() {
  const { user } = useAuth();

  const log = useCallback(async (
    action: string,
    entityType: EntityType,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;
    try {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        metadata: metadata ?? {},
      });
    } catch {
      // Non-critical — silently swallow logging errors
    }
  }, [user]);

  return { log };
}
