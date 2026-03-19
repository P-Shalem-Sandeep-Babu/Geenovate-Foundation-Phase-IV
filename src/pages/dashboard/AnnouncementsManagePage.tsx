import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  title: string;
  content: string;
  visibility: string;
  priority: string;
  approved_by_ceo: boolean;
  is_sticky: boolean;
  created_at: string;
}

const PRIORITY_CLASSES: Record<string, string> = {
  high:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function AnnouncementsManagePage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [filterPriority, setFilterPriority] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", content: "", visibility: "internal", priority: "medium",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const fetchItems = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data as Announcement[]);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      content: form.content,
      visibility: form.visibility as any,
      priority: form.priority as any,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement created" });
      setCreateOpen(false);
      setForm({ title: "", content: "", visibility: "internal", priority: "medium" });
      fetchItems();
    }
  };

  const toggleApproval = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ approved_by_ceo: !current })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: current ? "Approval revoked" : "Announcement approved" });
      fetchItems();
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      fetchItems();
    }
  };

  const filtered = filterPriority === "all"
    ? items
    : items.filter(a => a.priority === filterPriority);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Announcements</h1>
        <div className="flex items-center gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {isSuperAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Announcement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Announcement title"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Content</Label>
                    <Textarea
                      value={form.content}
                      onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                      placeholder="Write the announcement…"
                      required
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Visibility</Label>
                      <Select value={form.visibility} onValueChange={v => setForm(p => ({ ...p, visibility: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="cohort">Cohort</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating…" : "Create Announcement"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(a => (
          <Card key={a.id} className="card-interactive">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-base">{a.title}</p>
                  <Badge variant="secondary" className={`text-xs capitalize ${PRIORITY_CLASSES[a.priority] ?? ""}`}>
                    {a.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">{a.visibility}</Badge>
                  {a.is_sticky && (
                    <Badge variant="secondary" className="text-xs">Sticky</Badge>
                  )}
                  {a.approved_by_ceo && (
                    <Badge variant="approved" className="text-xs">Approved</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.content}</p>
                <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-wider font-semibold">
                  {new Date(a.created_at).toLocaleDateString("en-IN", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleApproval(a.id, a.approved_by_ceo)}
                    title={a.approved_by_ceo ? "Revoke approval" : "Approve"}
                  >
                    {a.approved_by_ceo
                      ? <XCircle className="h-4 w-4 text-muted-foreground" />
                      : <CheckCircle className="h-4 w-4 text-primary" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteItem(a.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-16 text-sm">
            No announcements found.
          </p>
        )}
      </div>
    </div>
  );
}
