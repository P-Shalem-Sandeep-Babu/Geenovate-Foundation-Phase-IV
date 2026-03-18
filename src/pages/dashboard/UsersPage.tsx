import { useEffect, useState } from "react";
import { Plus, Search, MoreHorizontal, UserCheck, UserX, UserMinus, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UserRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  category: string | null;
  created_at: string;
}

type AppRole = "super_admin" | "category_admin" | "member" | "viewer";

const ROLES: AppRole[] = ["super_admin", "category_admin", "member", "viewer"];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active:    <UserCheck className="h-3.5 w-3.5" />,
  inactive:  <UserMinus className="h-3.5 w-3.5" />,
  suspended: <UserX className="h-3.5 w-3.5" />,
  alumni:    <GraduationCap className="h-3.5 w-3.5" />,
};

const STATUS_CLASSES: Record<string, string> = {
  active:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive:  "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive",
  alumni:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function roleLabel(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function categoryLabel(c: string | null) {
  if (!c) return "—";
  return c.replace(/_/g, " ").replace(/\b\w/g, x => x.toUpperCase());
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "", email: "", password: "Geenovate@123", role: "member" as AppRole, category: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const fetchUsers = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (profilesRes.data) setUsers(profilesRes.data as UserRow[]);
    if (rolesRes.data) {
      const map: Record<string, string[]> = {};
      rolesRes.data.forEach(r => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      setUserRoles(map);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
        category: newUser.category || null,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error creating user", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User created", description: `${newUser.email} has been added.` });
      setCreateOpen(false);
      setNewUser({ full_name: "", email: "", password: "Geenovate@123", role: "member", category: "" });
      fetchUsers();
    }
  };

  const updateStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status: status as any }).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      fetchUsers();
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    if ((userRoles[userId] || []).includes(role)) {
      toast({ title: "User already has this role" });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role "${roleLabel(role)}" assigned` });
      fetchUsers();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role "${roleLabel(role)}" removed` });
      fetchUsers();
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    const matchCat = filterCategory === "all" || u.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">User Management</h1>
        {isSuperAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={newUser.full_name}
                    onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="e.g. Priya Sharma"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                    placeholder="priya@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Temporary Password</Label>
                  <Input
                    value={newUser.password}
                    onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v as AppRole }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Select value={newUser.category} onValueChange={v => setNewUser(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startups">Startups</SelectItem>
                        <SelectItem value="innovation_associates">Innovation Associates</SelectItem>
                        <SelectItem value="catalysts">Catalysts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="alumni">Alumni</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="startups">Startups</SelectItem>
            <SelectItem value="innovation_associates">Innovation Associates</SelectItem>
            <SelectItem value="catalysts">Catalysts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Roles</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">{u.full_name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 ${STATUS_CLASSES[u.status] ?? ""}`}
                      >
                        {STATUS_ICONS[u.status]}
                        {u.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{categoryLabel(u.category)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {(userRoles[u.user_id] ?? []).map(r => (
                          <Badge key={r} variant="outline" className="text-xs">{roleLabel(r)}</Badge>
                        ))}
                        {!(userRoles[u.user_id]?.length) && (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {isSuperAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatus(u.user_id, "active")}>
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(u.user_id, "inactive")}>
                              Set Inactive
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(u.user_id, "suspended")}>
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(u.user_id, "alumni")}>
                              Set Alumni
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Assign Role</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {ROLES.map(r => (
                                  <DropdownMenuItem key={r} onClick={() => assignRole(u.user_id, r)}>
                                    {roleLabel(r)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {(userRoles[u.user_id] ?? []).length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Remove Role</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {(userRoles[u.user_id] ?? []).map(r => (
                                    <DropdownMenuItem key={r} onClick={() => removeRole(u.user_id, r)}>
                                      {roleLabel(r)}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground text-sm">
                      No users found.
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
