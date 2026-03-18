import { useEffect, useState, useRef } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  login:  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

function getActionColor(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("creat")) return ACTION_COLOR.create;
  if (lower.includes("updat") || lower.includes("edit")) return ACTION_COLOR.update;
  if (lower.includes("delet") || lower.includes("remov")) return ACTION_COLOR.delete;
  if (lower.includes("login") || lower.includes("auth")) return ACTION_COLOR.login;
  return "bg-muted text-muted-foreground";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (data) setLogs(data as AuditLog[]);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      JSON.stringify(l.details ?? "").toLowerCase().includes(q) ||
      (l.ip_address ?? "").includes(q) ||
      (l.user_id ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Audit Logs</h1>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Search logs…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {logs.length} entries
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium whitespace-nowrap">Timestamp</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">User ID</th>
                  <th className="text-left p-3 font-medium">IP Address</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(l.created_at).toLocaleString("en-IN", {
                        dateStyle: "short", timeStyle: "short",
                      })}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className={`text-xs ${getActionColor(l.action)}`}>
                        {l.action}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">
                      {l.user_id ? l.user_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">
                      {l.ip_address ?? "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                      {l.details ? JSON.stringify(l.details) : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground text-sm">
                      {loading ? "Loading…" : "No audit logs found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
