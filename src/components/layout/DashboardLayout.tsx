import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Bell, Shield, LogOut, Menu, X, Calendar,
  Rocket, Lightbulb, ChevronRight, UserCircle, Check, CheckCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import logo from "@/assets/logo.png";

const navLinks = [
  { label: "Dashboard",     path: "/dashboard",               icon: LayoutDashboard, perm: null },
  { label: "Users",         path: "/dashboard/users",         icon: Users,           perm: "users.view" },
  { label: "Cohorts",       path: "/dashboard/cohorts",       icon: Calendar,        perm: "cohorts.view" },
  { label: "Ideas",         path: "/dashboard/ideas",         icon: Lightbulb,       perm: null },
  { label: "Startups",      path: "/dashboard/startups",      icon: Rocket,          perm: null },
  { label: "Announcements", path: "/dashboard/announcements", icon: Bell,            perm: "announcements.view" },
  { label: "Audit Logs",    path: "/dashboard/audit-logs",    icon: Shield,          perm: "audit.view" },
];

const TYPE_COLOR: Record<string, string> = {
  info:     "bg-blue-100 text-blue-700",
  success:  "bg-green-100 text-green-700",
  warning:  "bg-yellow-100 text-yellow-700",
  deadline: "bg-red-100 text-red-700",
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, hasPermission } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const visibleLinks = navLinks.filter(l => !l.perm || hasPermission(l.perm));

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);

  const NavItem = ({ l }: { l: typeof navLinks[0] }) => {
    const active = isActive(l.path);
    return (
      <Link
        to={l.path}
        onClick={() => setSidebarOpen(false)}
        className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
          active ? "text-sidebar-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5"
        }`}
      >
        {active && (
          <motion.div
            layoutId="activeNavBackground"
            className="absolute inset-0 bg-gradient-to-r from-sidebar-primary/20 to-transparent border-l-[3px] border-sidebar-primary"
            initial={false}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <l.icon className={`h-5 w-5 shrink-0 transition-all duration-300 relative z-10 ${active ? "text-sidebar-primary scale-110" : "text-sidebar-foreground/50 group-hover:scale-110 group-hover:text-sidebar-foreground"}`} />
        <span className="flex-1 relative z-10">{l.label}</span>
      </Link>
    );
  };

  const NotifPanel = () => (
    <div className="absolute right-0 top-full mt-1 w-80 bg-background border rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">Notifications</span>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline flex items-center gap-1">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto divide-y">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
        ) : notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${!n.is_read ? "bg-primary/3" : ""}`}
            onClick={() => markRead.mutate(n.id)}
          >
            <div className="flex items-start gap-3">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize shrink-0 mt-0.5 ${TYPE_COLOR[n.type] ?? TYPE_COLOR.info}`}>{n.type}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SidebarContent = () => (
    <>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/30 px-3 py-2">Menu</p>
        {visibleLinks.map(l => <NavItem key={l.path} l={l} />)}
      </nav>
      <div className="p-3 border-t bg-sidebar-accent/20">
        <Link to="/dashboard/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors group">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
          </div>
          <UserCircle className="h-4 w-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 shrink-0" />
        </Link>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/5 w-full mt-1 transition-colors">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-background/40 backdrop-blur-xl shrink-0 relative z-10">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <img src={logo} alt="Geenovate" className="h-9 relative z-10 drop-shadow-lg" />
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors relative"
            >
              <Bell className="h-4 w-4 text-sidebar-foreground/60" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="relative z-50"><NotifPanel /></div>
              </>
            )}
          </div>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="lg:hidden sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-2xl">
          <div className="flex items-center justify-between h-14 px-4">
            <img src={logo} alt="Geenovate" className="h-8" />
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setNotifOpen(v => !v)} className="p-2 rounded-md hover:bg-muted relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="relative z-50"><NotifPanel /></div>
                  </>
                )}
              </div>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-muted">
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t overflow-hidden bg-background">
                <nav className="px-4 py-2 space-y-0.5">
                  {visibleLinks.map(l => <NavItem key={l.path} l={l} />)}
                </nav>
                <div className="px-4 pb-3 border-t mt-1 pt-2">
                  <Link to="/dashboard/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <UserCircle className="h-4 w-4" /> Profile
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-destructive w-full">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
