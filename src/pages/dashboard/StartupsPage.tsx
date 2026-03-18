import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus, Edit2, Trash2, Users, ClipboardList, Link2, X,
  Rocket, Target, CheckCircle, Clock, ArrowUpRight, Presentation,
  DollarSign, Award, Star, BarChart2, MessageSquare, Loader2, Activity, Search, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useStartupHealth } from "@/hooks/useStartupHealth";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { exportToCSV } from "@/hooks/useExport";
import { useNotifications } from "@/hooks/useNotifications";

interface Startup {
  id: string; name: string; description: string | null; domain: string | null;
  status: string; stage: string | null; funding_received: number | null;
  funding_type: string | null; support_notes: string | null;
  review_notes: string | null; reviewed_by: string | null; reviewed_at: string | null;
  created_by: string | null; mentor_id: string | null;
  cohort_id: string | null; logo_url: string | null; website_url: string | null;
  created_at: string; updated_at: string;
}
interface ProfileRow { id: string; user_id: string; full_name: string; email: string; }
interface StartupMember { id: string; startup_id: string; user_id: string; role: string; joined_at: string; }
interface StartupTask { id: string; startup_id: string; title: string; description: string | null; deadline: string | null; status: string; assigned_to: string | null; created_by: string | null; }
interface StartupSubmission { id: string; startup_id: string; title: string; submission_link: string; submitted_by: string | null; submitted_at: string; }
interface StartupPitch { id: string; startup_id: string; title: string; pitch_link: string; demo_date: string | null; feedback: string | null; status: string; created_at: string; }
interface StartupScore { id: string; startup_id: string; reviewer_id: string; innovation_score: number; market_score: number; execution_score: number; team_score: number; total_score: number; feedback: string | null; created_at: string; }
interface Cohort { id: string; name: string; }

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  idea:      { label: "Idea",      className: "bg-amber-500/15 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]", icon: <Target className="h-3 w-3" /> },
  building:  { label: "Building",  className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]",   icon: <Rocket className="h-3 w-3" /> },
  launched:  { label: "Launched",  className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]", icon: <CheckCircle className="h-3 w-3" /> },
};

const STAGES = ["idea", "validation", "prototype", "mvp", "scaling"];

const EMPTY_FORM = { name: "", description: "", domain: "", status: "idea", stage: "idea", funding_received: 0, funding_type: "none", support_notes: "", website_url: "", mentor_id: "none", cohort_id: "none" };
const EMPTY_SCORE_FORM = { innovation_score: 7, market_score: 7, execution_score: 7, team_score: 7, feedback: "" };

function validateUrl(url: string): boolean {
  if (!url) return true;
  try { new URL(url); return true; } catch { return false; }
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 8) return <Badge className="bg-green-100 text-green-700 border-green-200">High</Badge>;
  if (score >= 5) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Medium</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">Low</Badge>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}/10</span>
      </div>
      <Progress value={value * 10} className="h-1.5" />
    </div>
  );
}

export default function StartupsPage() {
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [members, setMembers] = useState<StartupMember[]>([]);
  const [tasks, setTasks] = useState<StartupTask[]>([]);
  const [submissions, setSubmissions] = useState<StartupSubmission[]>([]);
  const [pitches, setPitches] = useState<StartupPitch[]>([]);
  const [scores, setScores] = useState<StartupScore[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editStartup, setEditStartup] = useState<Startup | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [newMember, setNewMember] = useState({ user_id: "none", role: "member" });

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<StartupTask | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", deadline: "", status: "pending", assigned_to: "none" });

  const [submissionFormOpen, setSubmissionFormOpen] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({ title: "", submission_link: "" });

  const [pitchFormOpen, setPitchFormOpen] = useState(false);
  const [pitchForm, setPitchForm] = useState({ title: "", pitch_link: "", demo_date: "" });

  const [reviewPitchOpen, setReviewPitchOpen] = useState(false);
  const [reviewPitchForm, setReviewPitchForm] = useState({ id: "", feedback: "", status: "reviewed" });

  const [scoreFormOpen, setScoreFormOpen] = useState(false);
  const [scoreForm, setScoreForm] = useState(EMPTY_SCORE_FORM);

  const [reviewStartupOpen, setReviewStartupOpen] = useState(false);
  const [reviewStartupForm, setReviewStartupForm] = useState({ status: "idea", review_notes: "" });

  const { toast } = useToast();
  const { isSuperAdmin, user } = useAuth();
  const { log } = useActivityLog();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { confirm, ConfirmNode } = useConfirm();
  const { sendNotification } = useNotifications();

  // Mentor: only see own startups
  const isMentor = !isSuperAdmin;

  const { data: startups = [], isLoading: startupsLoading } = useQuery({
    queryKey: ["startups"],
    queryFn: async () => {
      let q = supabase.from("startups").select("*").order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Startup[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const filteredStartups = startups
    .filter(s => !isMentor || s.mentor_id === user?.id || s.created_by === user?.id)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.domain?.toLowerCase().includes(search.toLowerCase()));

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles_minimal"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email").order("full_name");
      return (data ?? []) as ProfileRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ["cohorts_active"],
    queryFn: async () => {
      const { data } = await supabase.from("cohorts").select("id, name").eq("is_archived", false);
      return (data ?? []) as Cohort[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const fetchAll = useCallback(async () => { qc.invalidateQueries({ queryKey: ["startups"] }); }, [qc]);

  const loadDetail = useCallback(async (startupId: string) => {
    const [membersRes, tasksRes, subsRes, pitchesRes, scoresRes] = await Promise.all([
      supabase.from("startup_members").select("*").eq("startup_id", startupId),
      supabase.from("startup_tasks").select("*").eq("startup_id", startupId).order("created_at", { ascending: false }),
      supabase.from("startup_submissions").select("*").eq("startup_id", startupId).order("submitted_at", { ascending: false }),
      supabase.from("startup_pitches").select("*").eq("startup_id", startupId).order("created_at", { ascending: false }),
      supabase.from("startup_scores").select("*").eq("startup_id", startupId).order("created_at", { ascending: false }),
    ]);
    if (membersRes.data) setMembers(membersRes.data as StartupMember[]);
    if (tasksRes.data) setTasks(tasksRes.data as StartupTask[]);
    if (subsRes.data) setSubmissions(subsRes.data as StartupSubmission[]);
    if (pitchesRes.data) setPitches(pitchesRes.data as StartupPitch[]);
    if (scoresRes.data) setScores(scoresRes.data as StartupScore[]);
  }, []);

  const openStartup = (s: Startup) => { setSelectedStartup(s); loadDetail(s.id); };

  const openCreate = () => { setEditStartup(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (s: Startup) => {
    setEditStartup(s);
    setForm({
      name: s.name, description: s.description ?? "", domain: s.domain ?? "",
      status: s.status, stage: s.stage || "idea",
      funding_received: s.funding_received || 0, funding_type: s.funding_type || "none",
      support_notes: s.support_notes || "", website_url: s.website_url ?? "",
      mentor_id: s.mentor_id ?? "none", cohort_id: s.cohort_id ?? "none"
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (form.website_url && !validateUrl(form.website_url)) { toast({ title: "Invalid website URL", description: "Enter a full URL like https://example.com", variant: "destructive" }); return; }
    if (Number(form.funding_received) < 0) { toast({ title: "Funding cannot be negative", variant: "destructive" }); return; }
    setLoading(true);
    const payload = {
      name: form.name.trim(), description: form.description || null,
      domain: form.domain || null, status: form.status, stage: form.stage,
      funding_received: Number(form.funding_received) || 0,
      funding_type: form.funding_type === "none" ? null : form.funding_type,
      support_notes: form.support_notes || null,
      website_url: form.website_url || null,
      mentor_id: form.mentor_id === "none" ? null : form.mentor_id,
      cohort_id: form.cohort_id === "none" ? null : form.cohort_id,
      created_by: user?.id,
    };
    const { data: saved, error } = editStartup
      ? await supabase.from("startups").update(payload).eq("id", editStartup.id).select().single()
      : await supabase.from("startups").insert(payload).select().single();
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editStartup ? "✅ Startup updated" : "✅ Startup created" });
    if (!editStartup) await log("startup_created", "startup", saved?.id, { name: form.name });
    setFormOpen(false); qc.invalidateQueries({ queryKey: ["startups"] });
    if (selectedStartup?.id === editStartup?.id) loadDetail(selectedStartup!.id);
  };

  const deleteStartup = async (id: string) => {
    const ok = await confirm({ message: "This will permanently remove the startup and all its data.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    await supabase.from("startups").delete().eq("id", id);
    toast({ title: "Startup deleted" });
    if (selectedStartup?.id === id) setSelectedStartup(null);
    fetchAll();
  };

  const handleAddMember = async () => {
    if (!selectedStartup || newMember.user_id === "none") return;
    const { error } = await supabase.from("startup_members").insert({ startup_id: selectedStartup.id, user_id: newMember.user_id, role: newMember.role });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Member added" }); setMemberFormOpen(false); setNewMember({ user_id: "none", role: "member" });
    loadDetail(selectedStartup.id);
  };
  const removeMember = async (id: string) => { await supabase.from("startup_members").delete().eq("id", id); if (selectedStartup) loadDetail(selectedStartup.id); };

  const openTaskForm = (t?: StartupTask) => {
    setEditTask(t ?? null);
    setTaskForm({ title: t?.title ?? "", description: t?.description ?? "", deadline: t?.deadline ? t.deadline.slice(0, 16) : "", status: t?.status ?? "pending", assigned_to: t?.assigned_to ?? "none" });
    setTaskFormOpen(true);
  };
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStartup) return;
    const payload = { startup_id: selectedStartup.id, title: taskForm.title, description: taskForm.description || null, deadline: taskForm.deadline || null, status: taskForm.status, assigned_to: taskForm.assigned_to === "none" ? null : taskForm.assigned_to, created_by: user?.id };
    const { error } = editTask ? await supabase.from("startup_tasks").update(payload).eq("id", editTask.id) : await supabase.from("startup_tasks").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    
    if (!editTask && payload.assigned_to && payload.assigned_to !== user?.id) {
      await sendNotification(payload.assigned_to, "New Task Assigned", `You were assigned a new task: ${payload.title}`, "info", "startup_task", selectedStartup.id);
    }
    
    toast({ title: editTask ? "Task updated" : "Task created" }); setTaskFormOpen(false); loadDetail(selectedStartup.id);
  };
  const deleteTask = async (id: string) => { await supabase.from("startup_tasks").delete().eq("id", id); if (selectedStartup) loadDetail(selectedStartup.id); };
  const updateTaskStatus = async (id: string, status: string) => { await supabase.from("startup_tasks").update({ status }).eq("id", id); if (selectedStartup) loadDetail(selectedStartup.id); };

  const handleAddSubmission = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStartup) return;
    const { error } = await supabase.from("startup_submissions").insert({ startup_id: selectedStartup.id, title: submissionForm.title, submission_link: submissionForm.submission_link, submitted_by: user?.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Submission added" }); setSubmissionFormOpen(false); setSubmissionForm({ title: "", submission_link: "" }); loadDetail(selectedStartup.id);
  };

  const handleAddPitch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStartup) return;
    if (!validateUrl(pitchForm.pitch_link)) { toast({ title: "Invalid pitch link", description: "Enter a full URL like https://", variant: "destructive" }); return; }
    const { error } = await supabase.from("startup_pitches").insert({ startup_id: selectedStartup.id, title: pitchForm.title, pitch_link: pitchForm.pitch_link, demo_date: pitchForm.demo_date || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await log("pitch_submitted", "pitch", selectedStartup.id, { title: pitchForm.title });
    toast({ title: "✅ Pitch submitted" }); setPitchFormOpen(false); setPitchForm({ title: "", pitch_link: "", demo_date: "" }); loadDetail(selectedStartup.id);
  };
  const handleSavePitchReview = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStartup) return;
    const { error } = await supabase.from("startup_pitches").update({ feedback: reviewPitchForm.feedback, status: reviewPitchForm.status }).eq("id", reviewPitchForm.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review saved" }); setReviewPitchOpen(false); loadDetail(selectedStartup.id);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStartup || !user) return;
    const { error } = await supabase.from("startup_scores").insert({
      startup_id: selectedStartup.id, reviewer_id: user.id,
      innovation_score: scoreForm.innovation_score, market_score: scoreForm.market_score,
      execution_score: scoreForm.execution_score, team_score: scoreForm.team_score,
      feedback: scoreForm.feedback || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await log("score_submitted", "score", selectedStartup.id, { avg: ((scoreForm.innovation_score + scoreForm.market_score + scoreForm.execution_score + scoreForm.team_score) / 4).toFixed(1) });
    
    if (selectedStartup.created_by && selectedStartup.created_by !== user?.id) {
      await sendNotification(selectedStartup.created_by, "New Mentor Scorecard", `A mentor evaluated ${selectedStartup.name} and submitted a scorecard.`, "info", "startup", selectedStartup.id);
    }
    
    toast({ title: "⭐ Scorecard submitted!" }); setScoreFormOpen(false); setScoreForm(EMPTY_SCORE_FORM); loadDetail(selectedStartup.id);
  };

  const handleSaveStartupReview = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStartup || !user) return;
    const { error } = await supabase.from("startups").update({
      status: reviewStartupForm.status, review_notes: reviewStartupForm.review_notes || null,
      reviewed_by: user.id, reviewed_at: new Date().toISOString()
    }).eq("id", selectedStartup.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await log(`startup_status_${reviewStartupForm.status}`, "startup", selectedStartup.id, { status: reviewStartupForm.status });
    
    if (selectedStartup.created_by && selectedStartup.created_by !== user?.id) {
      await sendNotification(selectedStartup.created_by, "Startup Status Updated", `Your startup ${selectedStartup.name} is now marked as ${reviewStartupForm.status}.`, "info", "startup", selectedStartup.id);
    }

    toast({ title: "✅ Status updated" }); setReviewStartupOpen(false);
    setSelectedStartup(prev => prev ? { ...prev, status: reviewStartupForm.status, review_notes: reviewStartupForm.review_notes } : prev);
    qc.invalidateQueries({ queryKey: ["startups"] });
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const mentorProfile = selectedStartup?.mentor_id ? allProfiles.find(p => p.user_id === selectedStartup.mentor_id) : null;
  const availableForMember = allProfiles.filter(p => !members.find(m => m.user_id === p.user_id) && (memberSearch === "" || p.full_name.toLowerCase().includes(memberSearch.toLowerCase())));
  const profileMap = Object.fromEntries(allProfiles.map(p => [p.user_id, p]));

  // Scores + Health
  const avgScore = scores.length ? scores.reduce((s, r) => s + Number(r.total_score), 0) / scores.length : 0;
  const avgPct = Math.round((avgScore / 10) * 100);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const health = useStartupHealth({ totalTasks: tasks.length, completedTasks, stage: selectedStartup?.stage ?? null, avgScore });

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex h-full gap-0">
      {/* ── Left Panel ── */}
      <div className={`flex flex-col ${selectedStartup ? "hidden lg:flex lg:w-80 lg:border-r" : "flex-1"}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-2xl font-bold">{isMentor ? "My Startups" : "Startups"}</h1>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => exportToCSV(startups.map(s => ({ name: s.name, domain: s.domain ?? "", status: s.status, stage: s.stage ?? "", funding_received: s.funding_received ?? 0, created_at: new Date(s.created_at).toLocaleDateString() })), "startups_export")} className="gap-1.5">
                <Download className="h-4 w-4" />
              </Button>
            )}
            {isSuperAdmin && <Button size="sm" variant="gradient" onClick={openCreate} className="shadow-[0_0_15px_rgba(99,102,241,0.3)]"><Plus className="h-4 w-4 mr-1" /> New</Button>}
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search startups…" className="pl-9 h-9" />
        </div>
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {startupsLoading ? (
            <>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</>
          ) : filteredStartups.length === 0 ? (
            <EmptyState icon={Rocket} title="No startups yet" description={search ? "No match found." : "Create the first startup to get started."} action={isSuperAdmin && !search ? { label: "Create Startup", onClick: openCreate } : undefined} />
          ) : filteredStartups.map(s => {
            const sc = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.idea;
            const stageIndex = STAGES.indexOf(s.stage || "idea");
            const isSelected = selectedStartup?.id === s.id;
            return (
              <Card key={s.id}
                className={`cursor-pointer transition-all duration-200 border-2 hover:-translate-y-0.5 hover:shadow-md ${isSelected ? "border-primary/50 bg-primary/5" : "hover:border-border/80"}`}
                onClick={() => openStartup(s)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-sm leading-snug">{s.name}</h3>
                    <Badge variant="secondary" className={`text-xs flex items-center gap-1 shrink-0 ml-2 ${sc.className}`}>{sc.icon}{sc.label}</Badge>
                  </div>
                  {s.domain && <p className="text-xs text-muted-foreground mb-2">{s.domain}</p>}
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold capitalize">{s.stage || "idea"}</span>
                    <div className="flex gap-0.5">
                      {STAGES.map((st, i) => <div key={st} className={`h-1.5 w-4 rounded-full transition-colors ${i <= stageIndex ? "bg-primary" : "bg-muted"}`} />)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel ── */}
      {selectedStartup && (
        <div className="flex-1 flex flex-col min-w-0 lg:pl-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedStartup(null)}><X className="h-4 w-4" /></Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold">{selectedStartup.name}</h2>
                  <Badge variant="outline" className="capitalize text-xs font-semibold">{selectedStartup.stage || "idea"}</Badge>
                  <Badge variant="secondary" className={`text-xs flex items-center gap-1 ${STATUS_CONFIG[selectedStartup.status]?.className}`}>
                    {STATUS_CONFIG[selectedStartup.status]?.icon}{STATUS_CONFIG[selectedStartup.status]?.label}
                  </Badge>
                </div>
                {selectedStartup.domain && <p className="text-sm text-muted-foreground">{selectedStartup.domain}</p>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {isSuperAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setReviewStartupForm({ status: selectedStartup.status, review_notes: selectedStartup.review_notes || "" }); setReviewStartupOpen(true); }}><MessageSquare className="h-3 w-3 mr-1" />Review</Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedStartup)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => deleteStartup(selectedStartup.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                </>
              )}
            </div>
          </div>

          {/* Review Notes Banner */}
          {selectedStartup.review_notes && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200/50 dark:bg-blue-950/30 text-sm">
              <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3"/>Admin Review Note</p>
              <p className="text-foreground/80">{selectedStartup.review_notes}</p>
            </div>
          )}

          {/* Health Score Banner */}
          {selectedStartup && (
            <div className={`mb-4 p-4 rounded-xl border flex items-center justify-between gap-4 ${health.bgClass}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-semibold">Startup Health</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${health.bgClass} ${health.colorClass}`}>{health.label}</span>
                </div>
                <div className="w-full bg-black/10 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-700 ${health.barColorClass}`} style={{ width: `${health.score}%` }} />
                </div>
              </div>
              <span className={`text-2xl font-bold shrink-0 ${health.colorClass}`}>{health.score}%</span>
            </div>
          )}


          <div className="mb-4 bg-muted/30 p-4 rounded-xl border">
            <div className="flex justify-between items-center relative">
              <div className="absolute top-[7px] left-0 w-full h-1 bg-muted z-0"></div>
              <div className="absolute top-[7px] left-0 h-1 bg-primary z-0 transition-all duration-500"
                   style={{ width: `${(STAGES.indexOf(selectedStartup.stage || "idea") / (STAGES.length - 1)) * 100}%` }}></div>
              {STAGES.map((st, i) => {
                const isActive = i <= STAGES.indexOf(selectedStartup.stage || "idea");
                return (
                  <div key={st} className="relative z-10 flex flex-col items-center gap-1">
                    <div className={`h-4 w-4 rounded-full border-2 transition-colors ${isActive ? "bg-primary border-primary" : "bg-background border-muted"}`}></div>
                    <span className={`text-[10px] capitalize font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{st}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scorecard summary */}
          {scores.length > 0 && (
            <div className="mb-4 p-4 rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><BarChart2 className="h-4 w-4 text-indigo-600"/>Scorecard ({scores.length} review{scores.length > 1 ? "s" : ""})</h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-indigo-600">{avgScore.toFixed(1)}</span>
                  <div><ScoreBadge score={avgScore} /></div>
                </div>
              </div>
              <Progress value={avgPct} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground text-right">{avgPct}% overall</p>
            </div>
          )}

          {/* Meta + Funding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-xl bg-muted/40 border text-sm space-y-2">
              <h4 className="font-semibold text-sm">Details</h4>
              {selectedStartup.description && <p className="text-foreground/80">{selectedStartup.description}</p>}
              {mentorProfile && <p><span className="font-medium text-foreground/70">Mentor:</span> <span className="text-muted-foreground">{mentorProfile.full_name}</span></p>}
              {selectedStartup.website_url && (
                <a href={selectedStartup.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs font-medium">
                  <ArrowUpRight className="h-3 w-3" /> Website
                </a>
              )}
            </div>
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-sm text-green-800 dark:text-green-500">Funding & Support</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Amount</p>
                  <p className="font-bold text-lg flex items-center"><DollarSign className="h-4 w-4 -ml-0.5 opacity-50" />{selectedStartup.funding_received?.toLocaleString() || "0"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Type</p>
                  <p className="capitalize font-medium">{selectedStartup.funding_type || "None"}</p>
                </div>
              </div>
              {selectedStartup.support_notes && <p className="text-xs text-muted-foreground border-t border-green-500/10 pt-2">{selectedStartup.support_notes}</p>}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="team" className="flex-1">
            <TabsList className="mb-4 max-w-full flex whitespace-nowrap overflow-x-auto">
              <TabsTrigger value="team"><Users className="h-3.5 w-3.5 mr-1" />Team ({members.length})</TabsTrigger>
              <TabsTrigger value="tasks"><ClipboardList className="h-3.5 w-3.5 mr-1" />Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="submissions"><Link2 className="h-3.5 w-3.5 mr-1" />Submissions ({submissions.length})</TabsTrigger>
              <TabsTrigger value="pitches"><Presentation className="h-3.5 w-3.5 mr-1" />Pitches ({pitches.length})</TabsTrigger>
              <TabsTrigger value="scorecard"><Star className="h-3.5 w-3.5 mr-1" />Scorecard ({scores.length})</TabsTrigger>
            </TabsList>

            {/* Team tab */}
            <TabsContent value="team">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{members.length} member(s)</p>
                {isSuperAdmin && <Button size="sm" onClick={() => setMemberFormOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Member</Button>}
              </div>
              <div className="space-y-2">
                {members.map(m => { const p = profileMap[m.user_id]; return (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div><p className="text-sm font-medium">{p?.full_name ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{p?.email} · <span className="capitalize">{m.role}</span></p></div>
                    {isSuperAdmin && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70" onClick={() => removeMember(m.id)}><X className="h-3.5 w-3.5" /></Button>}
                  </div>
                ); })}
                {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No team members yet.</p>}
              </div>
            </TabsContent>

            {/* Tasks tab */}
            <TabsContent value="tasks">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-muted-foreground">{tasks.length} task(s) · <span className="font-medium text-foreground">{progress}% done</span></div>
                {isSuperAdmin && <Button size="sm" onClick={() => openTaskForm()}><Plus className="h-3.5 w-3.5 mr-1" /> Add Task</Button>}
              </div>
              <Progress value={progress} className="h-1.5 mb-3" />
              <div className="space-y-2">
                {tasks.map(t => {
                  const overdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed";
                  const assignee = t.assigned_to ? profileMap[t.assigned_to] : null;
                  return (
                    <div key={t.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          {t.deadline && <span className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}><Clock className="h-3 w-3 inline mr-0.5" />{new Date(t.deadline).toLocaleDateString()}</span>}
                          {assignee && <span className="text-xs text-muted-foreground">{assignee.full_name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3">
                        <Select value={t.status} onValueChange={v => updateTaskStatus(t.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        {isSuperAdmin && (<><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTaskForm(t)}><Edit2 className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70" onClick={() => deleteTask(t.id)}><Trash2 className="h-3 w-3" /></Button></>)}
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tasks yet.</p>}
              </div>
            </TabsContent>

            {/* Submissions tab */}
            <TabsContent value="submissions">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{submissions.length} submission(s)</p>
                <Button size="sm" onClick={() => setSubmissionFormOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                {submissions.map(s => { const submitter = s.submitted_by ? profileMap[s.submitted_by] : null; return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{submitter?.full_name ?? "Unknown"} · {new Date(s.submitted_at).toLocaleDateString()}</p></div>
                    <a href={s.submission_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Link2 className="h-3 w-3" /> View</a>
                  </div>
                ); })}
                {submissions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No submissions yet.</p>}
              </div>
            </TabsContent>

            {/* Pitches tab */}
            <TabsContent value="pitches">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{pitches.length} pitch(es)</p>
                <Button size="sm" onClick={() => setPitchFormOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Pitch</Button>
              </div>
              <div className="space-y-3">
                {pitches.map(p => (
                  <div key={p.id} className="flex flex-col p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          {p.title}
                          <Badge variant={p.status === "reviewed" ? "default" : "secondary"} className="text-[10px] capitalize">{p.status}</Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(p.created_at).toLocaleDateString()}{p.demo_date && ` · Demo: ${new Date(p.demo_date).toLocaleDateString()}`}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" asChild className="h-8"><a href={p.pitch_link} target="_blank" rel="noopener noreferrer"><ArrowUpRight className="h-3.5 w-3.5 mr-1" />View</a></Button>
                        {isSuperAdmin && <Button size="sm" className="h-8" onClick={() => { setReviewPitchForm({ id: p.id, feedback: p.feedback || "", status: p.status }); setReviewPitchOpen(true); }}>Review</Button>}
                      </div>
                    </div>
                    {p.feedback && <div className="bg-muted/40 p-2.5 rounded text-xs text-foreground/80 border"><p className="font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Feedback</p>{p.feedback}</div>}
                  </div>
                ))}
                {pitches.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pitches yet.</p>}
              </div>
            </TabsContent>

            {/* Scorecard tab */}
            <TabsContent value="scorecard">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{scores.length} review(s)</p>
                {isSuperAdmin && <Button size="sm" onClick={() => { setScoreForm(EMPTY_SCORE_FORM); setScoreFormOpen(true); }}><Star className="h-3.5 w-3.5 mr-1" /> Add Score</Button>}
              </div>
              <div className="space-y-4">
                {scores.map(s => {
                  const reviewer = profileMap[s.reviewer_id];
                  const pct = Math.round((Number(s.total_score) / 10) * 100);
                  return (
                    <Card key={s.id} className="overflow-hidden">
                      <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-purple-400" style={{ width: `${pct}%` }} />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-semibold text-sm">{reviewer?.full_name ?? "Reviewer"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-indigo-600">{Number(s.total_score).toFixed(1)}</span>
                            <ScoreBadge score={Number(s.total_score)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <ScoreBar label="Innovation" value={s.innovation_score} />
                          <ScoreBar label="Market Fit" value={s.market_score} />
                          <ScoreBar label="Execution" value={s.execution_score} />
                          <ScoreBar label="Team" value={s.team_score} />
                        </div>
                        {s.feedback && <div className="mt-3 p-2.5 bg-muted/40 rounded text-xs text-foreground/80 border"><p className="font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Feedback</p>{s.feedback}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
                {scores.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No scores submitted yet.</p>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ── Startup Form Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editStartup ? "Edit Startup" : "Create Startup"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>Website URL</Label><Input type="url" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://…" /></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="idea">Idea</SelectItem><SelectItem value="building">Building</SelectItem><SelectItem value="launched">Launched</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Domain</Label><Input value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="e.g. Fintech" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Lifecycle & Funding</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Stage</Label><Select value={form.stage} onValueChange={v => setForm(p => ({ ...p, stage: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Funding ($)</Label><Input type="number" min="0" value={form.funding_received} onChange={e => setForm(p => ({ ...p, funding_received: Number(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label>Funding Type</Label><Select value={form.funding_type} onValueChange={v => setForm(p => ({ ...p, funding_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="grant">Grant</SelectItem><SelectItem value="investment">Investment</SelectItem><SelectItem value="internal support">Internal Support</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Support Notes</Label><Input value={form.support_notes} onChange={e => setForm(p => ({ ...p, support_notes: e.target.value }))} placeholder="AWS credits…" /></div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Associations</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Mentor</Label><Select value={form.mentor_id} onValueChange={v => setForm(p => ({ ...p, mentor_id: v }))}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Cohort</Label><Select value={form.cohort_id} onValueChange={v => setForm(p => ({ ...p, cohort_id: v }))}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving…" : (editStartup ? "Update" : "Create Startup")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Member Dialog ── */}
      <Dialog open={memberFormOpen} onOpenChange={setMemberFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <Input placeholder="Search users…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="mb-3" />
          <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
            {availableForMember.slice(0, 20).map(p => (
              <label key={p.user_id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${newMember.user_id === p.user_id ? "bg-primary/10" : ""}`} onClick={() => setNewMember(prev => ({ ...prev, user_id: p.user_id }))}>
                <div><p className="text-sm font-medium">{p.full_name}</p><p className="text-xs text-muted-foreground">{p.email}</p></div>
              </label>
            ))}
          </div>
          <div className="space-y-1.5 mb-4"><Label>Role</Label><Select value={newMember.role} onValueChange={v => setNewMember(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="founder">Founder</SelectItem><SelectItem value="co-founder">Co-Founder</SelectItem><SelectItem value="developer">Developer</SelectItem><SelectItem value="designer">Designer</SelectItem><SelectItem value="marketing">Marketing</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent></Select></div>
          <Button className="w-full" onClick={handleAddMember} disabled={newMember.user_id === "none"}>Add Member</Button>
        </DialogContent>
      </Dialog>

      {/* ── Task Form ── */}
      <Dialog open={taskFormOpen} onOpenChange={setTaskFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTask} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Status</Label><Select value={taskForm.status} onValueChange={v => setTaskForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Deadline</Label><Input type="datetime-local" value={taskForm.deadline} onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Assign To</Label><Select value={taskForm.assigned_to} onValueChange={v => setTaskForm(p => ({ ...p, assigned_to: v }))}><SelectTrigger><SelectValue placeholder="Anyone" /></SelectTrigger><SelectContent><SelectItem value="none">Anyone</SelectItem>{members.map(m => { const p = profileMap[m.user_id]; return <SelectItem key={m.user_id} value={m.user_id}>{p?.full_name ?? m.user_id}</SelectItem>; })}</SelectContent></Select></div>
            <Button type="submit" className="w-full">{editTask ? "Update" : "Create Task"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Submission Form ── */}
      <Dialog open={submissionFormOpen} onOpenChange={setSubmissionFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Submission</DialogTitle></DialogHeader>
          <form onSubmit={handleAddSubmission} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={submissionForm.title} onChange={e => setSubmissionForm(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Submission Link *</Label><Input type="url" value={submissionForm.submission_link} onChange={e => setSubmissionForm(p => ({ ...p, submission_link: e.target.value }))} required placeholder="https://github.com/…" /></div>
            <Button type="submit" className="w-full">Submit</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Pitch Form ── */}
      <Dialog open={pitchFormOpen} onOpenChange={setPitchFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Pitch or Demo</DialogTitle></DialogHeader>
          <form onSubmit={handleAddPitch} className="space-y-4">
            <div className="space-y-1.5"><Label>Pitch Title *</Label><Input value={pitchForm.title} onChange={e => setPitchForm(p => ({ ...p, title: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Link (Video / Deck) *</Label><Input type="url" value={pitchForm.pitch_link} onChange={e => setPitchForm(p => ({ ...p, pitch_link: e.target.value }))} placeholder="https://..." required /></div>
            <div className="space-y-1.5"><Label>Demo Date (Optional)</Label><Input type="datetime-local" value={pitchForm.demo_date} onChange={e => setPitchForm(p => ({ ...p, demo_date: e.target.value }))} /></div>
            <Button type="submit" className="w-full">Submit Pitch</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Review Pitch Dialog ── */}
      <Dialog open={reviewPitchOpen} onOpenChange={setReviewPitchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Review Pitch</DialogTitle></DialogHeader>
          <form onSubmit={handleSavePitchReview} className="space-y-4">
            <div className="space-y-1.5"><Label>Status</Label><Select value={reviewPitchForm.status} onValueChange={v => setReviewPitchForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="reviewed">Reviewed</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Feedback</Label><Textarea value={reviewPitchForm.feedback} onChange={e => setReviewPitchForm(p => ({ ...p, feedback: e.target.value }))} rows={4} placeholder="Constructive feedback…" /></div>
            <Button type="submit" className="w-full">Save Review</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Startup Review Dialog ── */}
      <Dialog open={reviewStartupOpen} onOpenChange={setReviewStartupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Startup Status</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStartupReview} className="space-y-4">
            <div className="space-y-1.5"><Label>Status</Label><Select value={reviewStartupForm.status} onValueChange={v => setReviewStartupForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="idea">💡 Idea</SelectItem><SelectItem value="building">🚧 Building</SelectItem><SelectItem value="launched">🚀 Launched</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Review Notes</Label><Textarea value={reviewStartupForm.review_notes} onChange={e => setReviewStartupForm(p => ({ ...p, review_notes: e.target.value }))} rows={4} placeholder="Add notes visible to the team…" /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Score Form Dialog ── */}
      <Dialog open={scoreFormOpen} onOpenChange={setScoreFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" />Submit Scorecard</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveScore} className="space-y-4">
            {(["innovation_score", "market_score", "execution_score", "team_score"] as const).map((field) => {
              const labels: Record<string, string> = { innovation_score: "Innovation (1–10)", market_score: "Market Fit (1–10)", execution_score: "Execution (1–10)", team_score: "Team (1–10)" };
              return (
                <div key={field} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{labels[field]}</Label>
                    <span className="font-bold text-indigo-600">{scoreForm[field]}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={scoreForm[field]}
                    onChange={e => setScoreForm(p => ({ ...p, [field]: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer" />
                  <Progress value={scoreForm[field] * 10} className="h-1.5" />
                </div>
              );
            })}
            <div className="space-y-1.5"><Label>Overall Feedback</Label><Textarea value={scoreForm.feedback} onChange={e => setScoreForm(p => ({ ...p, feedback: e.target.value }))} rows={3} placeholder="What are the startup's strengths and areas to improve?" /></div>
            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
              <span className="text-sm font-semibold">Avg Score</span>
              <span className="text-xl font-bold text-indigo-600">{((scoreForm.innovation_score + scoreForm.market_score + scoreForm.execution_score + scoreForm.team_score) / 4).toFixed(1)}/10</span>
            </div>
            <Button type="submit" className="w-full">Submit Scorecard</Button>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmNode}
    </motion.div>
  );
}
