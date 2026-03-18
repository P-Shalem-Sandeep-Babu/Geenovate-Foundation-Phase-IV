import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCircle, Mail, Tag, Lock, Save, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string; user_id: string; full_name: string; email: string;
  bio: string | null; avatar_url: string | null; category: string | null; status: string;
}

export default function ProfilePage() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", bio: "", avatar_url: "" });
  const [formReady, setFormReady] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setForm({ full_name: (data as Profile).full_name, bio: (data as Profile).bio ?? "", avatar_url: (data as Profile).avatar_url ?? "" });
        setFormReady(true);
      }
      return data as Profile | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name.trim(),
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ Profile saved" });
      qc.invalidateQueries({ queryKey: ["my_profile"] });
      qc.invalidateQueries({ queryKey: ["profiles_minimal"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const STATUS_COLOR: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-red-100 text-red-700 border-red-200",
    alumni: "bg-purple-100 text-purple-700 border-purple-200",
  };

  const ROLE_LABEL: Record<string, string> = {
    super_admin: "Admin",
    category_admin: "Mentor",
    member: "Professional",
    viewer: "Viewer",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-primary" /> My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information and account settings.</p>
      </div>

      {/* Avatar + Status */}
      <Card className="mb-5">
        <CardContent className="p-5 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{form.full_name?.charAt(0)?.toUpperCase() ?? "?"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5" />{profile?.email}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile?.status && (
                <Badge className={`text-xs border capitalize ${STATUS_COLOR[profile.status] ?? STATUS_COLOR.inactive}`}>{profile.status}</Badge>
              )}
              {roles.map(r => (
                <Badge key={r} className="text-xs bg-primary/10 text-primary border-primary/20">
                  <Shield className="h-3 w-3 mr-1" />{ROLE_LABEL[r] ?? r}
                </Badge>
              ))}
              {profile?.category && (
                <Badge className="text-xs bg-muted text-muted-foreground">
                  <Tag className="h-3 w-3 mr-1" />{profile.category}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="mb-5">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Edit Details</h2>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3}
              placeholder="A short description about yourself…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Avatar URL</Label>
            <Input
              value={form.avatar_url}
              onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-muted-foreground">Paste a public image URL for your avatar.</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !formReady} className="w-full">
            {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Profile</>}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Security</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change your login password</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/change-password"><Lock className="h-3.5 w-3.5 mr-1.5" />Change Password</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
