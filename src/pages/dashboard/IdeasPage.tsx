import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Lightbulb, Eye, MessageSquare, Loader2, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { exportToCSV } from "@/hooks/useExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useNotifications } from "@/hooks/useNotifications";

interface StartupIdea {
  id: string; user_id: string; title: string; problem: string; solution: string;
  domain: string | null; stage: string | null; status: string; created_at: string;
  review_notes: string | null; reviewed_by: string | null; reviewed_at: string | null;
}
interface ProfileRow { id: string; user_id: string; full_name: string; email: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: "Pending",      color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200" },
  under_review: { label: "Under Review", color: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-200"   },
  approved:     { label: "Approved",     color: "text-green-700 dark:text-green-400",   bg: "bg-green-100 dark:bg-green-900/30 border-green-200"  },
  rejected:     { label: "Rejected",     color: "text-red-700 dark:text-red-400",       bg: "bg-red-100 dark:bg-red-900/30 border-red-200"      },
};
const STAGE_LABELS: Record<string, string> = {
  idea: "Pure Idea", validation: "Validating", prototype: "Prototyping",
};
const EMPTY_FORM = { title: "", problem: "", solution: "", domain: "", stage: "idea" };

// ── Validation ──────────────────────────────────────────────────
function validateIdeaForm(form: typeof EMPTY_FORM): string | null {
  if (!form.title.trim()) return "Title is required.";
  if (form.title.trim().length < 3) return "Title must be at least 3 characters.";
  if (!form.problem.trim()) return "Problem statement is required.";
  if (form.problem.trim().length < 10) return "Problem must be at least 10 characters.";
  if (!form.solution.trim()) return "Solution is required.";
  if (form.solution.trim().length < 10) return "Solution must be at least 10 characters.";
  return null;
}

export default function IdeasPage() {
  const { toast } = useToast();
  const { isSuperAdmin, user } = useAuth();
  const { log } = useActivityLog();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<StartupIdea | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: "under_review", review_notes: "" });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { confirm, ConfirmNode } = useConfirm();
  const { sendNotification } = useNotifications();

  // ── Data fetching with React Query ──────────────────────────
  const { data: ideas = [], isLoading: ideasLoading } = useQuery({
    queryKey: ["startup_ideas", isSuperAdmin, user?.id],
    queryFn: async () => {
      let query = supabase.from("startup_ideas").select("*").order("created_at", { ascending: false });
      if (!isSuperAdmin && user) query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StartupIdea[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles_minimal"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email");
      return (data ?? []) as ProfileRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const profileMap = Object.fromEntries(allProfiles.map(p => [p.user_id, p]));

  // ── Submit Idea Mutation ─────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      // Duplicate check
      const { data: existing } = await supabase
        .from("startup_ideas")
        .select("id")
        .eq("user_id", user!.id)
        .ilike("title", data.title.trim())
        .maybeSingle();
      if (existing) throw new Error("You already submitted an idea with a similar title.");
      const { error } = await supabase.from("startup_ideas").insert({
        title: data.title.trim(), problem: data.problem.trim(),
        solution: data.solution.trim(), domain: data.domain.trim() || null,
        stage: data.stage, user_id: user!.id, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ Idea submitted!", description: "Your idea is now pending review." });
      qc.invalidateQueries({ queryKey: ["startup_ideas"] });
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
      setFormError(err.message);
    },
  });

  // ── Review Mutation ──────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, review_notes }: { id: string; status: string; review_notes: string }) => {
      const { error } = await supabase.from("startup_ideas").update({
        status, review_notes: review_notes || null,
        reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: async ({ id, status }) => {
      toast({ title: "Review saved" });
      await log(`idea_${status}`, "idea", id, { status });
      
      if (selectedIdea) {
        let msg = `Your idea "${selectedIdea.title}" was reviewed and marked as ${STATUS_CONFIG[status]?.label || status}.`;
        let type: "info" | "success" | "warning" = "info";
        if (status === "approved") type = "success";
        if (status === "rejected") type = "warning";
        await sendNotification(selectedIdea.user_id, "Idea Review Update", msg, type as any, "idea", id);
      }

      qc.invalidateQueries({ queryKey: ["startup_ideas"] });
      setReviewOpen(false);
    },
    onError: (err: Error) => toast({ title: "Review failed", description: err.message, variant: "destructive" }),
  });

  // ── Convert to Startup Mutation ──────────────────────────────
  const convertMutation = useMutation({
    mutationFn: async (idea: StartupIdea) => {
      const { error } = await supabase.from("startups").insert({
        name: idea.title, description: idea.solution, domain: idea.domain,
        status: "idea", stage: idea.stage || "idea", created_by: idea.user_id,
      });
      if (error) throw error;
      await supabase.from("startup_ideas").update({
        status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString()
      }).eq("id", idea.id);
      return idea.id;
    },
    onSuccess: async (id) => {
      toast({ title: "🚀 Converted to Startup!" });
      await log("idea_converted_to_startup", "idea", id);
      qc.invalidateQueries({ queryKey: ["startup_ideas"] });
      qc.invalidateQueries({ queryKey: ["startups"] });
    },
    onError: (err: Error) => toast({ title: "Conversion failed", description: err.message, variant: "destructive" }),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateIdeaForm(form);
    if (err) { setFormError(err); return; }
    setFormError(null);
    submitMutation.mutate(form);
  };

  const openReview = (idea: StartupIdea) => {
    setSelectedIdea(idea);
    setReviewForm({ status: idea.status, review_notes: idea.review_notes || "" });
    setReviewOpen(true);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea) return;
    // If rejecting, confirm first (wrapped externally via confirm())
    reviewMutation.mutate({ id: selectedIdea.id, ...reviewForm });
  };

  const displayIdeas = (filterStatus === "all" ? ideas : ideas.filter(i => i.status === filterStatus))
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.domain?.toLowerCase().includes(search.toLowerCase()) || i.problem.toLowerCase().includes(search.toLowerCase()));

  const handleExport = () => {
    exportToCSV(ideas.map(i => ({
      title: i.title, status: i.status, stage: i.stage, domain: i.domain ?? "",
      problem: i.problem.slice(0, 100), solution: i.solution.slice(0, 100),
      created_at: new Date(i.created_at).toLocaleDateString(),
    })), "ideas_export");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-yellow-100 text-yellow-600"><Lightbulb className="h-5 w-5" /></span>
            Startup Ideas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Submit and track incubation ideas through a structured review workflow.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" />Export
            </Button>
          )}
          <Button onClick={() => { setForm(EMPTY_FORM); setFormError(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Submit Idea
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ideas by title, domain, or problem…"
          className="pl-9"
        />
      </div>

      {/* Stats filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 ${filterStatus === key ? "ring-2 ring-primary/40 border-primary/30" : "border-border/60 hover:border-primary/30"} bg-card`}
          >
            <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
            <p className="text-2xl font-bold mt-1">{ideas.filter(i => i.status === key).length}</p>
          </button>
        ))}
      </div>

      {/* Ideas Grid */}
      {ideasLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : displayIdeas.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl bg-muted/10">
          <EmptyState
            icon={Lightbulb}
            title={filterStatus !== "all" ? `No ${STATUS_CONFIG[filterStatus]?.label} ideas` : "No ideas yet"}
            description={filterStatus !== "all" ? "Try a different filter." : "Submit your first startup idea using the button above."}
            action={filterStatus === "all" ? { label: "Submit Idea", onClick: () => setFormOpen(true) } : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayIdeas.map(idea => {
            const authUser = profileMap[idea.user_id];
            const cfg = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.pending;
            return (
              <Card key={idea.id}
                className="relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                <div className={`h-1 w-full ${
                  idea.status === "approved" ? "bg-green-500" :
                  idea.status === "rejected" ? "bg-red-500" :
                  idea.status === "under_review" ? "bg-blue-500" : "bg-yellow-400"
                }`} />
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-semibold text-base leading-tight line-clamp-2">{idea.title}</h3>
                    <Badge className={`shrink-0 text-[11px] border font-semibold capitalize ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                  {idea.domain && (
                    <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full w-fit mb-3">
                      {idea.domain} · {STAGE_LABELS[idea.stage || "idea"] ?? idea.stage}
                    </span>
                  )}
                  <div className="space-y-2.5 text-sm flex-1">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Problem</p>
                      <p className="line-clamp-2 text-foreground/80">{idea.problem}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Solution</p>
                      <p className="line-clamp-2 text-foreground/80">{idea.solution}</p>
                    </div>
                  </div>
                  {idea.review_notes && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50">
                      <p className="text-[10px] font-semibold text-blue-600 mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />Reviewer Notes
                      </p>
                      <p className="text-xs text-foreground/80 line-clamp-2">{idea.review_notes}</p>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">{authUser?.full_name ?? "Unknown"}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(idea.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {isSuperAdmin && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openReview(idea)}>
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>
                      )}
                      {isSuperAdmin && idea.status === "approved" && (
                        <Button size="sm" className="h-8 gap-1.5"
                          onClick={() => convertMutation.mutate(idea)}
                          disabled={convertMutation.isPending}>
                          {convertMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "→ Startup"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Submit Idea Dialog ── */}
      <Dialog open={formOpen} onOpenChange={open => { setFormOpen(open); if (!open) setFormError(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />Submit Startup Idea
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setFormError(null); }}
                placeholder="Name your concept (min 3 chars)"
                className={!form.title && formError ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>The Problem <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.problem}
                onChange={e => { setForm(p => ({ ...p, problem: e.target.value })); setFormError(null); }}
                rows={3} placeholder="What problem are you solving? (min 10 chars)"
                className={!form.problem && formError ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Your Solution <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.solution}
                onChange={e => { setForm(p => ({ ...p, solution: e.target.value })); setFormError(null); }}
                rows={3} placeholder="How does your startup solve it? (min 10 chars)"
                className={!form.solution && formError ? "border-destructive" : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Domain</Label>
                <Input value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="e.g. HealthTech" />
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(p => ({ ...p, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Pure Idea</SelectItem>
                    <SelectItem value="validation">Validating</SelectItem>
                    <SelectItem value="prototype">Prototyping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Idea"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Admin Review Dialog ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review: {selectedIdea?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveReview} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Update Status</Label>
              <Select value={reviewForm.status} onValueChange={v => setReviewForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="under_review">🔍 Under Review</SelectItem>
                  <SelectItem value="approved">✅ Approved</SelectItem>
                  <SelectItem value="rejected">❌ Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Review Notes</Label>
              <Textarea
                value={reviewForm.review_notes}
                onChange={e => setReviewForm(p => ({ ...p, review_notes: e.target.value }))}
                rows={4} placeholder="Add constructive feedback for the submitter…"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setReviewOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
