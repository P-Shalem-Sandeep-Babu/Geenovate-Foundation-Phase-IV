import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "super_admin" | "category_admin" | "member" | "viewer";
type UserStatus = "active" | "inactive" | "suspended" | "alumni";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: UserStatus;
  must_change_password: boolean;
  category: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: string[];
  loading: boolean;
  isSuperAdmin: boolean;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = roles.includes("super_admin");

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile, roles, and permissions in parallel
      const [profileRes, rolesRes, permsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.rpc("get_user_permissions" as any, { _user_id: userId }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as unknown as Profile);
        // Block suspended users
        if (profileRes.data.status === "suspended") {
          await supabase.auth.signOut();
          return;
        }
      }

      if (rolesRes.data) {
        setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
      }

      if (permsRes.data && Array.isArray(permsRes.data)) {
        setPermissions(permsRes.data.map((p: any) => p.name || p));
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          // Use setTimeout to avoid Supabase deadlocks
          setTimeout(() => fetchUserData(sess.user.id), 0);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
        }
        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchUserData(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const hasPermission = useCallback(
    (perm: string) => isSuperAdmin || permissions.includes(perm),
    [isSuperAdmin, permissions]
  );

  const hasRole = useCallback(
    (role: AppRole) => roles.includes(role),
    [roles]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchUserData(user.id);
  }, [user, fetchUserData]);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, roles, permissions, loading, isSuperAdmin, hasPermission, hasRole, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
