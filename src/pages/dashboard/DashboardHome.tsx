import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Users, Calendar, ClipboardList, AlertTriangle, BarChart3,
  TrendingUp, Activity, Trophy, Bell, BotMessageSquare,
  ChevronRight, Clock, CheckCircle, Send, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingBanner } from "@/components/ui/onboarding-banner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

interface Stats {
  totalUsers: number; activeCohorts: number; pendingTasks: number;
  completedTasks: number; atRiskMembers: number; avgPerformance: number;
  totalStartups: number; totalSubmissions: number;
}

interface LeaderboardEntry { user_id: string; full_name: string; email: string; completed: number; total: number; pct: number; }
interface ActivityEntry { id: string; action: string; entity_type: string | null; created_at: string; user_id: string | null; }
interface Notification { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string; }
interface PerfPoint { period: string; avg: number; }
interface TaskStatus { status: string; count: number; }
interface ChatMessage { role: "user" | "assistant"; content: string; }

const EMPTY_STATS: Stats = {
  totalUsers: 0, activeCohorts: 0, pendingTasks: 0, completedTasks: 0,
  atRiskMembers: 0, avgPerformance: 0, totalStartups: 0, totalSubmissions: 0,
};

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split("T")[0];
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  task_created: <ClipboardList className="h-3.5 w-3.5 text-primary" />,
  submission_added: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  feedback_added: <Trophy className="h-3.5 w-3.5 text-yellow-500" />,
  cohort_created: <Calendar className="h-3.5 w-3.5 text-blue-500" />,
  user_created: <Users className="h-3.5 w-3.5 text-purple-500" />,
};

const TYPE_BADGE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  deadline: "bg-red-100 text-red-700",
  success: "bg-green-100 text-green-700",
};

export default function DashboardHome() {
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [perfTrend, setPerfTrend] = useState<PerfPoint[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<TaskStatus[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterCohort, setFilterCohort] = useState("all");
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);

  // AI Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your incubation assistant. Ask me for task suggestions, performance insights, or program guidance." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("cohorts").select("id, name").eq("is_archived", false).order("year", { ascending: false })
      .then(({ data }) => { if (data) setCohorts(data); });
  }, []);

  useEffect(() => {
    const load = async () => {
      const weekStart = getWeekStart();

      const [profilesRes, cohortsRes, scoresRes, tasksRes, startupsRes, subsRes, notifRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("cohorts").select("id", { count: "exact", head: true }).eq("is_archived", false),
        supabase.from("performance_scores").select("overall_score, is_at_risk, user_id, cohort_id"),
        (() => { let q = supabase.from("tasks").select("id, status, cohort_id"); if (filterCohort !== "all") q = q.eq("cohort_id", filterCohort); return q; })(),
        supabase.from("startups").select("id", { count: "exact", head: true }),
        supabase.from("submissions").select("id", { count: "exact", head: true }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const scores = scoresRes.data ?? [];
      const tasks = tasksRes.data ?? [];
      const atRisk = scores.filter(s => s.is_at_risk).length;
      const avg = scores.length ? Math.round(scores.reduce((s, r) => s + Number(r.overall_score), 0) / scores.length) : 0;
      const statusMap: Record<string, number> = {};
      tasks.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
      setTasksByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

      setStats({
        totalUsers: profilesRes.count ?? 0,
        activeCohorts: cohortsRes.count ?? 0,
        pendingTasks: tasks.filter(t => t.status === "pending").length,
        completedTasks: tasks.filter(t => t.status === "completed").length,
        atRiskMembers: atRisk,
        avgPerformance: avg,
        totalStartups: startupsRes.count ?? 0,
        totalSubmissions: subsRes.count ?? 0,
      });
      if (notifRes.data) setNotifications(notifRes.data as Notification[]);
    };
    load();
  }, [filterCohort]);

  useEffect(() => {
    const load = async () => {
      let q = supabase.from("performance_scores").select("period_end, overall_score, cohort_id").order("period_end", { ascending: true });
      if (filterCohort !== "all") q = q.eq("cohort_id", filterCohort);
      const { data } = await q;
      if (!data?.length) { setPerfTrend([]); return; }
      const grouped: Record<string, number[]> = {};
      data.forEach(d => {
        if (!grouped[d.period_end]) grouped[d.period_end] = [];
        grouped[d.period_end].push(Number(d.overall_score));
      });
      setPerfTrend(Object.entries(grouped).slice(-12).map(([period, vals]) => ({
        period, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      })));
    };
    load();
  }, [filterCohort]);

  // Leaderboard
  useEffect(() => {
    const load = async () => {
      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from("tasks").select("assigned_to, status").not("assigned_to", "is", null),
        supabase.from("profiles").select("user_id, full_name, email"),
      ]);
      const tasks = tasksRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
      const userMap: Record<string, { completed: number; total: number }> = {};
      tasks.forEach(t => {
        if (!t.assigned_to) return;
        if (!userMap[t.assigned_to]) userMap[t.assigned_to] = { completed: 0, total: 0 };
        userMap[t.assigned_to].total++;
        if (t.status === "completed") userMap[t.assigned_to].completed++;
      });
      const lb: LeaderboardEntry[] = Object.entries(userMap)
        .map(([uid, v]) => ({
          user_id: uid,
          full_name: profileMap[uid]?.full_name ?? "Unknown",
          email: profileMap[uid]?.email ?? "",
          ...v,
          pct: v.total ? Math.round((v.completed / v.total) * 100) : 0,
        }))
        .sort((a, b) => b.completed - a.completed || b.pct - a.pct)
        .slice(0, 8);
      setLeaderboard(lb);
    };
    load();
  }, []);

  // Activity
  useEffect(() => {
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setActivity(data as ActivityEntry[]); });
  }, []);

  // AI Chat
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: [...chatMessages, userMsg] },
      });
      if (error) throw error;
      setChatMessages(prev => [...prev, { role: "assistant", content: data?.reply ?? "Sorry, I could not process that." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, the AI assistant is currently unavailable." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const statCards = [
    { label: "Total Users",      value: stats.totalUsers,           icon: Users,         gradient: "from-blue-500/20 to-indigo-500/20 border-blue-500/20",    iconBg: "bg-blue-500/20 text-blue-400" },
    { label: "Active Cohorts",   value: stats.activeCohorts,        icon: Calendar,      gradient: "from-violet-500/20 to-purple-500/20 border-violet-500/20",  iconBg: "bg-violet-500/20 text-violet-400" },
    { label: "Pending Tasks",    value: stats.pendingTasks,         icon: ClipboardList, gradient: "from-amber-500/20 to-yellow-500/20 border-amber-500/20",   iconBg: "bg-amber-500/20 text-amber-400" },
    { label: "Completed Tasks",  value: stats.completedTasks,       icon: TrendingUp,    gradient: "from-green-500/20 to-emerald-500/20 border-green-500/20", iconBg: "bg-green-500/20 text-green-400" },
    { label: "At-Risk Members",  value: stats.atRiskMembers,        icon: AlertTriangle, gradient: "from-red-500/20 to-rose-500/20 border-red-500/20",       iconBg: "bg-red-500/20 text-red-400" },
    { label: "Avg Performance",  value: `${stats.avgPerformance}%`, icon: BarChart3,     gradient: "from-cyan-500/20 to-sky-500/20 border-cyan-500/20",      iconBg: "bg-cyan-500/20 text-cyan-400" },
    { label: "Startups",         value: stats.totalStartups,        icon: Activity,      gradient: "from-orange-500/20 to-amber-500/20 border-orange-500/20",  iconBg: "bg-orange-500/20 text-orange-400" },
    { label: "Submissions",      value: stats.totalSubmissions,     icon: CheckCircle,   gradient: "from-teal-500/20 to-green-500/20 border-teal-500/20",    iconBg: "bg-teal-500/20 text-teal-400" },
  ];

  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
      <OnboardingBanner />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">
          {isSuperAdmin ? "CEO Dashboard" : "Dashboard"}
        </h1>
        <div className="flex items-center gap-2">
          <Select value={filterCohort} onValueChange={setFilterCohort}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Cohorts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cohorts</SelectItem>
              {cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`bg-gradient-to-br ${c.gradient} border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${c.iconBg}`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Charts — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {perfTrend.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Performance Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={perfTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {tasksByStatus.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tasks by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tasksByStatus}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {perfTrend.length === 0 && tasksByStatus.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No performance or task data yet. Create cohorts and assign tasks to see charts here.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
                {unreadNotifs > 0 && (
                  <Badge className="ml-auto text-xs">{unreadNotifs}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-2.5 rounded-lg border text-xs ${!n.is_read ? "bg-primary/5 border-primary/20" : ""}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[n.type] ?? ""}`}>{n.type}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />}
                      </div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-muted-foreground">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No task data yet</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((u, i) => (
                    <div key={u.user_id} className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${u.pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{u.completed}/{u.total}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary">{u.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Timeline */}
      {activity.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.slice(0, 10).map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                    {ACTIVITY_ICONS[a.action] ?? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm capitalize">{a.action.replace(/_/g, " ")}</p>
                    {a.entity_type && <p className="text-xs text-muted-foreground capitalize">{a.entity_type}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen ? (
          <Card className="w-80 shadow-xl border-2">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BotMessageSquare className="h-4 w-4 text-primary" /> AI Assistant
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChatOpen(false)}>
                  <ClipboardList className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64 px-4">
                <div className="space-y-3 py-2">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /></div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2 p-3 border-t">
                <Input
                  placeholder="Ask anything…"
                  className="h-8 text-xs"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendChat} disabled={chatLoading}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button size="icon" variant="gradient" className="h-14 w-14 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all hover:scale-110" onClick={() => setChatOpen(true)}>
            <BotMessageSquare className="h-6 w-6" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
