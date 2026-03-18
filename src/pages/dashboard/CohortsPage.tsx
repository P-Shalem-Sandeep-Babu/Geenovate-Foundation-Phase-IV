import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, Archive, RotateCcw, ChevronRight, Users, BookOpen,
  ClipboardList, Link2, Star, Trash2, Edit2, X, FileText, Video, Globe,
  Search, Download, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { exportToCSV } from "@/hooks/useExport";
import { useNotifications } from "@/hooks/useNotifications";

interface Cohort {
  id: string;
  name: string;
  year: number;
  description: string | null;
  skills: string | null;
  start_date: string | null;
  end_date: string | null;
  mentor_id: string | null;
  is_archived: boolean;
  created_at: string;
}

interface ProfileRow { id: string; user_id: string; full_name: string; email: string; }
interface Member { id: string; user_id: string; joined_at: string; profiles: ProfileRow | null; }
interface Task {
  id: string; cohort_id: string; title: string; description: string | null;
  deadline: string | null; status: string; priority: string; assigned_to: string | null;
}
interface Submission { id: string; task_id: string; user_id: string; submission_link: string; notes: string | null; submitted_at: string; }
interface Feedback { id: string; submission_id: string; mentor_id: string; comment: string; rating: number; }
interface Resource { id: string; cohort_id: string; title: string; type: string; url: string; }

const EMPTY_COHORT_FORM = {
  name: "", year: new Date().getFullYear(), description: "", skills: "",
  start_date: "", end_date: "", mentor_id: "none",
};

function cohortStatus(c: Cohort): "active" | "expired" | "archived" | "upcoming" {
  if (c.is_archived) return "archived";
  if (!c.end_date) return "active";
  const now = new Date();
  if (new Date(c.end_date) < now) return "expired";
  if (c.start_date && new Date(c.start_date) > now) return "upcoming";
  return "active";
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" },
  expired:  { label: "Expired",   className: "bg-red-500/15 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]" },
  archived: { label: "Archived",  className: "bg-muted text-muted-foreground border-white/5" },
  upcoming: { label: "Upcoming",  className: "bg-blue-500/15 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]" },
};

function ResourceIcon({ type }: { type: string }) {
  if (type === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (type === "video") return <Video className="h-4 w-4 text-purple-500" />;
  return <Globe className="h-4 w-4 text-blue-500" />;
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [allStartups, setAllStartups] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const { confirm, ConfirmNode } = useConfirm();
  const { sendNotification } = useNotifications();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCohort, setEditCohort] = useState<Cohort | null>(null);
  const [form, setForm] = useState(EMPTY_COHORT_FORM);
  const [loading, setLoading] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  // Detail pane state
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [cohortStartups, setCohortStartups] = useState<any[]>([]);

  // Add-member modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Task form
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", deadline: "", priority: "medium", assigned_to: "none" });
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Resource form
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", type: "link", url: "" });

  // Submission / feedback
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ comment: "", rating: "5" });

  const { toast } = useToast();
  const { isSuperAdmin, user } = useAuth();

  const fetchCohorts = useCallback(async () => {
    const { data } = await supabase.from("cohorts").select("*").order("year", { ascending: false });
    if (data) setCohorts(data as Cohort[]);
    const { data: sData } = await supabase.from("startups").select("id, name, cohort_id, user_id, status").order("name");
    if (sData) setAllStartups(sData);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, full_name, email").order("full_name");
    if (data) setAllProfiles(data as ProfileRow[]);
  }, []);

  useEffect(() => { fetchCohorts(); fetchProfiles(); }, [fetchCohorts, fetchProfiles]);

  const loadCohortDetail = useCallback(async (cohortId: string) => {
    const [membersRes, tasksRes, resourcesRes, submissionsRes, feedbacksRes] = await Promise.all([
      supabase.from("cohort_members").select("id, user_id, joined_at").eq("cohort_id", cohortId),
      supabase.from("tasks").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false }),
      supabase.from("resources").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false }),
      supabase.from("submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("submission_feedback").select("*"),
    ]);

    const rawMembers = (membersRes.data ?? []) as { id: string; user_id: string; joined_at: string }[];
    const profileMap = Object.fromEntries(allProfiles.map(p => [p.user_id, p]));
    setMembers(rawMembers.map(m => ({ ...m, profiles: profileMap[m.user_id] ?? null })));
    setTasks((tasksRes.data ?? []) as Task[]);
    setResources((resourcesRes.data ?? []) as Resource[]);

    // Filter submissions to this cohort's tasks
    const cohortTaskIds = new Set((tasksRes.data ?? []).map((t: Task) => t.id));
    setSubmissions(((submissionsRes.data ?? []) as Submission[]).filter(s => cohortTaskIds.has(s.task_id)));
    setFeedbacks((feedbacksRes.data ?? []) as Feedback[]);

    setCohortStartups(allStartups.filter(s => s.cohort_id === cohortId));
  }, [allProfiles, allStartups]);

  const openCohort = (c: Cohort) => {
    setSelectedCohort(c);
    loadCohortDetail(c.id);
  };

  const handleEnrollStartup = async (startupId: string) => {
    if (!selectedCohort) return;
    await supabase.from("startups").update({ cohort_id: selectedCohort.id }).eq("id", startupId);
    toast({ title: "Startup enrolled in cohort" });
    fetchCohorts(); // re-fetches allStartups
    loadCohortDetail(selectedCohort.id);
  };
  const handleRemoveStartup = async (startupId: string) => {
    if (!selectedCohort) return;
    await supabase.from("startups").update({ cohort_id: null }).eq("id", startupId);
    toast({ title: "Startup removed from cohort" });
    fetchCohorts();
    loadCohortDetail(selectedCohort.id);
  };

  // ─── Create / Edit Cohort ───────────────────────────────────
  const openCreate = () => {
    setEditCohort(null);
    setForm(EMPTY_COHORT_FORM);
    setCreateOpen(true);
  };

  const openEdit = (c: Cohort) => {
    setEditCohort(c);
    setForm({
      name: c.name, year: c.year, description: c.description ?? "",
      skills: c.skills ?? "", start_date: c.start_date ? c.start_date.slice(0, 10) : "",
      end_date: c.end_date ? c.end_date.slice(0, 10) : "",
      mentor_id: c.mentor_id ?? "none",
    });
    setCreateOpen(true);
  };

  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      toast({ title: "End date must be after start date", variant: "destructive" });
      return;
    }
    setLoading(true);
    const payload = {
      name: form.name, year: form.year,
      description: form.description || null, skills: form.skills || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      mentor_id: form.mentor_id === "none" ? null : form.mentor_id,
    };
    const { error } = editCohort
      ? await supabase.from("cohorts").update(payload).eq("id", editCohort.id)
      : await supabase.from("cohorts").insert(payload);
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editCohort ? "Cohort updated" : "Cohort created" });
    setCreateOpen(false);
    fetchCohorts();
    if (selectedCohort?.id === editCohort?.id) loadCohortDetail(selectedCohort!.id);
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    if (!archived) {
      const ok = await confirm({ message: "Are you sure you want to archive this cohort?", confirmLabel: "Archive", destructive: true });
      if (!ok) return;
    }
    await supabase.from("cohorts").update({ is_archived: !archived }).eq("id", id);
    toast({ title: archived ? "Cohort restored" : "Cohort archived" });
    fetchCohorts();
  };

  // ─── Members ────────────────────────────────────────────────
  const handleAddMembers = async () => {
    if (!selectedCohort || !selectedUserIds.length) return;
    const existing = new Set(members.map(m => m.user_id));
    const newEntries = selectedUserIds.filter(uid => !existing.has(uid));
    if (!newEntries.length) { toast({ title: "All selected users are already members" }); return; }
    const { error } = await supabase.from("cohort_members").insert(
      newEntries.map(uid => ({ cohort_id: selectedCohort.id, user_id: uid }))
    );
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    
    // Notify new members
    Promise.all(newEntries.map(uid => 
      sendNotification(uid, "Added to Cohort", `You have been added to the cohort: ${selectedCohort.name}`, "info", "cohort", selectedCohort.id)
    ));
    
    toast({ title: `${newEntries.length} member(s) added` });
    setAddMemberOpen(false);
    setSelectedUserIds([]);
    loadCohortDetail(selectedCohort.id);
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("cohort_members").delete().eq("id", memberId);
    toast({ title: "Member removed" });
    if (selectedCohort) loadCohortDetail(selectedCohort.id);
  };

  // ─── Tasks ──────────────────────────────────────────────────
  const openTaskForm = (t?: Task) => {
    setEditTask(t ?? null);
    setTaskForm({
      title: t?.title ?? "", description: t?.description ?? "",
      deadline: t?.deadline ? t.deadline.slice(0, 16) : "",
      priority: t?.priority ?? "medium",
      assigned_to: t?.assigned_to ?? "none",
    });
    setTaskFormOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort) return;
    const status = selectedCohort.end_date && new Date(selectedCohort.end_date) < new Date() ? null : undefined;
    const payload = {
      cohort_id: selectedCohort.id,
      title: taskForm.title, description: taskForm.description || null,
      deadline: taskForm.deadline || null, priority: taskForm.priority,
      assigned_to: taskForm.assigned_to === "none" ? null : taskForm.assigned_to,
      created_by: user?.id,
      ...(status ? {} : {}),
    };
    const { error } = editTask
      ? await supabase.from("tasks").update(payload).eq("id", editTask.id)
      : await supabase.from("tasks").insert({ ...payload, status: "pending" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    
    if (!editTask && payload.assigned_to && payload.assigned_to !== user?.id) {
      await sendNotification(payload.assigned_to, "New Task Assigned", `You have a new task in ${selectedCohort.name}: ${payload.title}`, "info", "cohort_task", selectedCohort.id);
    }
    
    toast({ title: editTask ? "Task updated" : "Task created" });
    setTaskFormOpen(false);
    loadCohortDetail(selectedCohort.id);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    toast({ title: "Task deleted" });
    if (selectedCohort) loadCohortDetail(selectedCohort.id);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", taskId);
    if (selectedCohort) loadCohortDetail(selectedCohort.id);
  };

  // ─── Resources ──────────────────────────────────────────────
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort) return;
    const { error } = await supabase.from("resources").insert({
      cohort_id: selectedCohort.id, title: resourceForm.title,
      type: resourceForm.type, url: resourceForm.url, uploaded_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Resource added" });
    setResourceFormOpen(false);
    setResourceForm({ title: "", type: "link", url: "" });
    loadCohortDetail(selectedCohort.id);
  };

  const deleteResource = async (id: string) => {
    await supabase.from("resources").delete().eq("id", id);
    toast({ title: "Resource removed" });
    if (selectedCohort) loadCohortDetail(selectedCohort.id);
  };

  // ─── Feedback ───────────────────────────────────────────────
  const handleAddFeedback = async (submissionId: string) => {
    if (!user) return;
    const { error } = await supabase.from("submission_feedback").insert({
      submission_id: submissionId, mentor_id: user.id,
      comment: feedbackForm.comment, rating: parseInt(feedbackForm.rating),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    
    // Notify submission owner
    const sFound = submissions.find(s => s.id === submissionId);
    if (sFound && sFound.user_id !== user.id) {
      const tFound = tasks.find(t => t.id === sFound.task_id);
      await sendNotification(sFound.user_id, "New Feedback", `A mentor left feedback on your submission for "${tFound?.title || 'a task'}".`, "info", "submission", submissionId);
    }
    
    toast({ title: "Feedback submitted" });
    setFeedbackOpen(null);
    setFeedbackForm({ comment: "", rating: "5" });
    if (selectedCohort) loadCohortDetail(selectedCohort.id);
  };

  // ─── Computed ───────────────────────────────────────────────
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const taskCompletion = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const mentorProfile = selectedCohort?.mentor_id ? allProfiles.find(p => p.user_id === selectedCohort.mentor_id) : null;
  const filteredProfiles = allProfiles.filter(p =>
    !members.find(m => m.user_id === p.user_id) &&
    (memberSearch === "" || p.full_name.toLowerCase().includes(memberSearch.toLowerCase()) || p.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const isMentor = !isSuperAdmin;
  const filteredCohorts = cohorts
    .filter(c => !isMentor || c.mentor_id === user?.id)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const unassignedStartups = allStartups.filter(s => s.cohort_id !== selectedCohort?.id);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex h-full gap-0">
      {/* Left panel — cohort list */}
      <div className={`flex flex-col ${selectedCohort ? "hidden lg:flex lg:w-80 lg:border-r" : "flex-1"}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-2xl font-bold">{isMentor ? "My Cohorts" : "Cohorts"}</h1>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => exportToCSV(cohorts.map(c => ({ name: c.name, year: c.year, mentor: c.mentor_id, status: cohortStatus(c) })), "cohorts_export")} className="gap-1.5 hover:bg-muted">
                <Download className="h-4 w-4" />
              </Button>
            )}
            {isSuperAdmin && (
              <Button size="sm" variant="gradient" onClick={openCreate} className="shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            )}
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cohorts…" className="pl-9 h-9" />
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {filteredCohorts.map(c => {
            const st = cohortStatus(c);
            const sb = STATUS_BADGE[st];
            const isSelected = selectedCohort?.id === c.id;
            return (
              <Card
                key={c.id}
                className={`cursor-pointer transition-all border-2 ${isSelected ? "border-primary/50 bg-primary/5" : "hover:border-border/80"} ${c.is_archived ? "opacity-60" : ""}`}
                onClick={() => openCohort(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-sm">{c.name}</h3>
                    <Badge variant="secondary" className={`text-xs ${sb.className}`}>{sb.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Year {c.year}</p>
                  {c.end_date && (
                    <p className="text-xs text-muted-foreground">
                      Ends {new Date(c.end_date).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredCohorts.length === 0 && (
            <p className="text-center text-muted-foreground py-16 text-sm">
              {search ? "No matches found." : "No cohorts yet."}
            </p>
          )}
        </div>
      </div>

      {/* Right panel — cohort detail */}
      {selectedCohort && (
        <div className="flex-1 flex flex-col min-w-0 lg:pl-6">
          {/* Detail header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedCohort(null)}>
                <X className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{selectedCohort.name}</h2>
                  <Badge variant="secondary" className={`text-xs ${STATUS_BADGE[cohortStatus(selectedCohort)].className}`}>
                    {STATUS_BADGE[cohortStatus(selectedCohort)].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Year {selectedCohort.year}
                  {selectedCohort.start_date && ` · ${new Date(selectedCohort.start_date).toLocaleDateString()}`}
                  {selectedCohort.end_date && ` → ${new Date(selectedCohort.end_date).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedCohort)}>
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleArchive(selectedCohort.id, selectedCohort.is_archived)}>
                  {selectedCohort.is_archived ? <><RotateCcw className="h-3 w-3 mr-1" />Restore</> : <><Archive className="h-3 w-3 mr-1" />Archive</>}
                </Button>
              </div>
            )}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Members</p><p className="text-xl font-bold">{members.length}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Tasks</p><p className="text-xl font-bold">{tasks.length}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold">{completedTasks}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Progress</p><p className="text-xl font-bold">{taskCompletion}%</p></CardContent></Card>
          </div>
          <Progress value={taskCompletion} className="mb-4 h-1.5" />

          {/* Meta info */}
          {(selectedCohort.description || selectedCohort.skills || mentorProfile) && (
            <div className="mb-4 p-4 rounded-lg bg-muted/40 border space-y-2 text-sm">
              {selectedCohort.description && <p className="text-foreground/80">{selectedCohort.description}</p>}
              {selectedCohort.skills && <p><span className="font-medium">Skills:</span> <span className="text-muted-foreground">{selectedCohort.skills}</span></p>}
              {mentorProfile && <p><span className="font-medium">Mentor:</span> <span className="text-muted-foreground">{mentorProfile.full_name} ({mentorProfile.email})</span></p>}
            </div>
          )}

          <Tabs defaultValue="startups" className="flex-1">
            <TabsList className="mb-4 overflow-x-auto flex-nowrap w-full justify-start border-b rounded-none bg-transparent p-0">
              <TabsTrigger value="startups" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><Rocket className="h-3.5 w-3.5 mr-1.5" />Startups ({cohortStartups.length})</TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><Users className="h-3.5 w-3.5 mr-1.5" />Members ({members.length})</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="submissions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><Link2 className="h-3.5 w-3.5 mr-1.5" />Submissions ({submissions.length})</TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Resources ({resources.length})</TabsTrigger>
            </TabsList>

            {/* ── Startups Tab ── */}
            <TabsContent value="startups">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{cohortStartups.length} startup(s) in this cohort</p>
                {isSuperAdmin && !selectedCohort.is_archived && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(v) => handleEnrollStartup(v)} value="">
                      <SelectTrigger className="w-48 h-8 text-xs">
                        <SelectValue placeholder="Enroll empty startup…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedStartups.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                        {unassignedStartups.length === 0 && <SelectItem value="none" disabled>No avail startups</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {cohortStartups.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold mt-1 bg-yellow-100 text-yellow-700">{s.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && !selectedCohort.is_archived && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive/70 hover:text-destructive" onClick={() => handleRemoveStartup(s.id)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {cohortStartups.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No startups assigned yet.</p>}
              </div>
            </TabsContent>

            {/* ── Members Tab ── */}
            <TabsContent value="members">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{members.length} member(s)</p>
                {isSuperAdmin && !selectedCohort.is_archived && (
                  <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Members
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">{m.profiles?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{m.profiles?.email ?? m.user_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </span>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => removeMember(m.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No members yet.</p>}
              </div>
            </TabsContent>

            {/* ── Tasks Tab ── */}
            <TabsContent value="tasks">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{tasks.length} task(s)</p>
                {isSuperAdmin && !selectedCohort.is_archived && (
                  <Button size="sm" onClick={() => openTaskForm()}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {tasks.map(t => {
                  const overdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed";
                  return (
                    <div key={t.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                          <Badge variant="secondary" className={`text-xs ${
                            t.priority === "high" ? "bg-red-100 text-red-700" :
                            t.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }`}>{t.priority}</Badge>
                          {overdue && <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive">Overdue</Badge>}
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                        {t.deadline && (
                          <p className={`text-xs mt-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                            Due {new Date(t.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 shrink-0">
                        <Select value={t.status} onValueChange={v => updateTaskStatus(t.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        {isSuperAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTaskForm(t)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deleteTask(t.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tasks yet.</p>}
              </div>
            </TabsContent>

            {/* ── Submissions Tab ── */}
            <TabsContent value="submissions">
              <div className="space-y-3">
                {submissions.map(s => {
                  const task = tasks.find(t => t.id === s.task_id);
                  const fb = feedbacks.filter(f => f.submission_id === s.id);
                  const submitter = allProfiles.find(p => p.user_id === s.user_id);
                  return (
                    <div key={s.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{submitter?.full_name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">Task: {task?.title ?? "—"}</p>
                        </div>
                        <a href={s.submission_link} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Link2 className="h-3 w-3" /> View
                        </a>
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground mb-2">{s.notes}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</p>
                      {fb.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {fb.map(f => (
                            <div key={f.id} className="text-xs bg-muted/50 rounded p-2">
                              <div className="flex items-center gap-1 mb-0.5">
                                {[1,2,3,4,5].map(i => <Star key={i} className={`h-2.5 w-2.5 ${i <= f.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />)}
                              </div>
                              <p>{f.comment}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {feedbackOpen === s.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            placeholder="Feedback comment…"
                            rows={2}
                            className="text-xs"
                            value={feedbackForm.comment}
                            onChange={e => setFeedbackForm(p => ({ ...p, comment: e.target.value }))}
                          />
                          <div className="flex items-center gap-2">
                            <Select value={feedbackForm.rating} onValueChange={v => setFeedbackForm(p => ({ ...p, rating: v }))}>
                              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? "s" : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddFeedback(s.id)}>Submit</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFeedbackOpen(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setFeedbackOpen(s.id)}>
                          <Star className="h-3 w-3 mr-1" /> Add Feedback
                        </Button>
                      )}
                    </div>
                  );
                })}
                {submissions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No submissions yet.</p>}
              </div>
            </TabsContent>

            {/* ── Resources Tab ── */}
            <TabsContent value="resources">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">{resources.length} resource(s)</p>
                {isSuperAdmin && (
                  <Button size="sm" onClick={() => setResourceFormOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Resource
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {resources.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <ResourceIcon type={r.type} />
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline">Open</a>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deleteResource(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {resources.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No resources yet.</p>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ── Create/Edit Cohort Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCohort ? "Edit Cohort" : "Create Cohort"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCohort} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cohort Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cohort 2025-A" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) || p.year }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Mentor</Label>
                <Select value={form.mentor_id} onValueChange={v => setForm(p => ({ ...p, mentor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Skills / Focus Areas</Label>
              <Input value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="e.g. Product, Marketing, Tech" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : (editCohort ? "Update Cohort" : "Create Cohort")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Members Dialog ── */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Members to {selectedCohort?.name}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Search users…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="mb-3" />
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {filteredProfiles.map(p => (
              <label key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(p.user_id)}
                  onChange={e => setSelectedUserIds(prev =>
                    e.target.checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id)
                  )}
                  className="rounded"
                />
                <div>
                  <p className="text-sm font-medium">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
              </label>
            ))}
            {filteredProfiles.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No users available.</p>}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button className="flex-1" onClick={handleAddMembers} disabled={!selectedUserIds.length}>
              Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ""} Members
            </Button>
            <Button variant="outline" onClick={() => { setAddMemberOpen(false); setSelectedUserIds([]); }}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Task Form Dialog ── */}
      <Dialog open={taskFormOpen} onOpenChange={setTaskFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTask} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input type="datetime-local" value={taskForm.deadline} onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={taskForm.assigned_to} onValueChange={v => setTaskForm(p => ({ ...p, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Anyone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Anyone</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name ?? m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">{editTask ? "Update Task" : "Create Task"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Resource Form Dialog ── */}
      <Dialog open={resourceFormOpen} onOpenChange={setResourceFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Resource</DialogTitle></DialogHeader>
          <form onSubmit={handleAddResource} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={resourceForm.title} onChange={e => setResourceForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={resourceForm.type} onValueChange={v => setResourceForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input type="url" value={resourceForm.url} onChange={e => setResourceForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" required />
            </div>
            <Button type="submit" className="w-full">Add Resource</Button>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmNode}
    </motion.div>
  );
}
