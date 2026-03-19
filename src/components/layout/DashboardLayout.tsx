import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Bell, Shield, LogOut, Menu, X, Calendar,
  Rocket, Lightbulb, UserCircle, CheckCheck
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

const NOTIF_TYPE_STYLE: Record<string, string> = {
  info:     "bg-blue-500/15 text-blue-400",
  success:  "bg-emerald-500/15 text-emerald-400",
  warning:  "bg-amber-500/15 text-amber-400",
  deadline: "bg-red-500/15 text-red-400",
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
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  /* ── Nav Item ── */
  const NavItem = ({ l }: { l: typeof navLinks[0] }) => {
    const active = isActive(l.path);
    return (
      <Link
        to={l.path}
        onClick={() => setSidebarOpen(false)}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
          active
            ? "text-primary bg-primary/10 border border-primary/15"
            : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-foreground/6"
        }`}
      >
        <l.icon
          className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
            active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
          }`}
        />
        <span>{l.label}</span>
        {active && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        )}
      </Link>
    );
  };

  /* ── Notification Panel ── */
  const NotifPanel = () => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
        ) : notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors ${!n.is_read ? "bg-primary/4" : ""}`}
            onClick={() => markRead.mutate(n.id)}
          >
            <div className="flex items-start gap-3">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize shrink-0 mt-0.5 ${NOTIF_TYPE_STYLE[n.type] ?? NOTIF_TYPE_STYLE.info}`}>
                {n.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium leading-snug ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Sidebar Content ── */
  const SidebarContent = () => (
    <>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase font-bold tracking-widest text-sidebar-foreground/25 px-3 pb-2 pt-1">
          Navigation
        </p>
        {visibleLinks.map(l => <NavItem key={l.path} l={l} />)}
      </nav>

      {/* Profile + Sign Out */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <Link
          to="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors group mb-0.5"
        >
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
            <span className="text-xs font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{profile?.email}</p>
          </div>
          <UserCircle className="h-3.5 w-3.5 text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50 shrink-0 transition-colors" />
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/6 w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[-8%] w-[35%] h-[35%] bg-primary/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-8%] w-[25%] h-[25%] bg-accent/15 rounded-full blur-[110px] pointer-events-none" />

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-white/5 bg-background/50 backdrop-blur-xl shrink-0 relative z-10">
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
          <img src={logo} alt="Geenovate" className="h-8 object-contain" />
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors relative"
            >
              <Bell className="h-4 w-4 text-sidebar-foreground/50" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
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

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-2xl">
          <div className="flex items-center justify-between h-13 px-4">
            <img src={logo} alt="Geenovate" className="h-7" />
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="p-2 rounded-lg hover:bg-muted/50 relative transition-colors"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
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
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {sidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Mobile nav drawer */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border overflow-hidden bg-background/95 backdrop-blur"
              >
                <nav className="px-3 py-2 space-y-0.5">
                  {visibleLinks.map(l => <NavItem key={l.path} l={l} />)}
                </nav>
                <div className="px-4 pb-3 border-t border-border mt-1 pt-2 space-y-1">
                  <Link
                    to="/dashboard/profile"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <UserCircle className="h-4 w-4" /> Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-destructive w-full transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
