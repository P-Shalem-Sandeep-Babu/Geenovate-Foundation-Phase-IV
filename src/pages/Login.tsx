import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import loginBg from "@/assets/Geenovate Entrance.avif";

const DOMAIN = "@gcet.edu.in";

function validateRollNumber(roll: string): string | null {
  if (!roll.trim()) return "Roll number is required.";
  if (!/^[a-z0-9]+$/.test(roll)) return "Only letters and numbers are allowed.";
  return null;
}

export default function Login() {
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState(""); // used only for forgot-password mode
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [rollError, setRollError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleRollChange = (val: string) => {
    // Allow only alphanumeric, auto-lowercase
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    setRollNumber(cleaned);
    if (rollError) setRollError(null);
    if (formError) setFormError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const err = validateRollNumber(rollNumber);
    if (err) { setRollError(err); return; }

    setLoading(true);
    const constructedEmail = `${rollNumber}${DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email: constructedEmail, password });
    setLoading(false);

    if (error) {
      setFormError("Invalid roll number or password. Please try again.");
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    toast({
      title: "Reset link sent",
      description: "If an account exists with this email, a reset link has been sent.",
    });
    setMode("login");
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel: Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-14 bg-background relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="mb-8">
            <img src={logo} alt="Geenovate" className="h-12 object-contain" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            {mode === "login" ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to your Geenovate account.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
                  Reset Password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email to receive a reset link.
                </p>
              </>
            )}
          </div>

          {/* Error Banner */}
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {formError}
            </motion.div>
          )}

          {/* ── Login Form ── */}
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Roll Number */}
              <div className="space-y-2">
                <Label htmlFor="roll" className="text-sm font-medium">
                  Roll Number
                </Label>
                <div className="flex items-stretch gap-0">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="roll"
                      type="text"
                      placeholder="e.g. 22eg1a0501"
                      className={`pl-9 rounded-r-none focus-visible:z-10 ${rollError ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
                      value={rollNumber}
                      onChange={(e) => handleRollChange(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                  <div className="flex items-center px-3 border border-l-0 border-input bg-muted/50 rounded-r-md text-sm text-muted-foreground font-medium whitespace-nowrap shrink-0">
                    {DOMAIN}
                  </div>
                </div>
                {rollError && (
                  <p className="text-xs text-destructive mt-1">{rollError}</p>
                )}
                <p className="text-xs text-muted-foreground/70">
                  Use your college roll number (lowercase, no spaces)
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-9 pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign In"}
              </Button>

              {/* Forgot password */}
              <button
                type="button"
                onClick={() => { setMode("forgot"); setFormError(null); }}
                className="w-full text-sm text-primary hover:text-primary/80 hover:underline text-center transition-colors"
              >
                Forgot your password?
              </button>
            </form>
          ) : (
            /* ── Forgot Password Form ── */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your-roll@gcet.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </span>
                ) : "Send Reset Link"}
              </Button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground/50 mt-10">
            Closed platform — authorised users only.
          </p>
        </motion.div>
      </div>

      {/* ── Right Panel: Visual ── */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative overflow-hidden">
        {/* Background image */}
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(1px)" }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/45" />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20" />

        {/* Content on the right panel */}
        <div className="relative z-10 flex flex-col justify-end h-full p-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <p className="text-white/90 text-xs font-semibold uppercase tracking-widest mb-3">
              Geenovate Foundation
            </p>
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-snug mb-3">
              Empowering the next<br />generation of innovators.
            </h2>
            <p className="text-white/60 text-sm max-w-sm leading-relaxed">
              A unified platform for managing cohorts, startups, ideas, and student milestones — built for incubation excellence.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
