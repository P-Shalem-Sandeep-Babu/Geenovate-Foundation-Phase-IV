import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "deadline";
  is_read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as AppNotification[];
    },
    staleTime: 30 * 1000,
    enabled: !!user,
    refetchInterval: 60 * 1000, // poll every minute
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("notifications").update({ is_read: true })
        .eq("user_id", user.id).eq("is_read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const sendNotification = useCallback(async (
    targetUserId: string,
    title: string,
    message: string,
    type: AppNotification["type"] = "info",
    entityType?: string,
    entityId?: string
  ) => {
    try {
      await supabase.from("notifications").insert({
        user_id: targetUserId, title, message, type,
        entity_type: entityType ?? null, entity_id: entityId ?? null,
      });
    } catch { /* non-critical */ }
  }, []);

  return { notifications, unreadCount, isLoading, markRead, markAllRead, sendNotification };
}
