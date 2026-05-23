import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Wrench, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { signIn } from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signIn(email, password);
      toast.success(`Welcome back, ${user.full_name ?? "Admin"}`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden text-white"
           style={{ background: "var(--gradient-dark)" }}>
        <div className="absolute inset-0 opacity-25"
             style={{
               backgroundImage:
                 "radial-gradient(circle at 20% 20%, oklch(0.72 0.18 235 / 0.6), transparent 50%), radial-gradient(circle at 80% 80%, oklch(0.6 0.2 250 / 0.5), transparent 55%)",
             }} />
        <div className="relative flex items-center gap-3">
          <div className="size-12 rounded-xl bg-white/95 p-1.5 grid place-items-center">
            <img src={logo} alt="Yova Auto" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight">Yova Auto</div>
            <div className="text-xs text-white/70">Garage Management System</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-display font-bold leading-tight">
            Run your mobile mechanic business <span className="text-[hsl(195_90%_70%)]">like a pro.</span>
          </h1>
          <p className="text-white/75">
            Manage customers, vehicles, repair jobs, quotes and invoices — all in one premium, fast, offline-ready workspace.
          </p>
          <div className="grid gap-3">
            {[
              { icon: Wrench, t: "Job cards & kanban repair workflow" },
              { icon: Sparkles, t: "Beautiful PDF invoices & reports" },
              { icon: ShieldCheck, t: "Local SQLite — your data stays with you" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3 text-sm text-white/85">
                <div className="size-8 rounded-lg bg-white/10 grid place-items-center"><Icon className="size-4" /></div>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/50">© {new Date().getFullYear()} Yova Auto · United Kingdom</div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-12 rounded-xl bg-white p-1.5 grid place-items-center shadow-[var(--shadow-soft)]">
              <img src={logo} alt="Yova Auto" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-display text-xl font-bold">Yova Auto</div>
              <div className="text-xs text-muted-foreground">Garage Management</div>
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold">Welcome back</h2>
          <p className="text-muted-foreground mt-2">Sign in to your garage workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" required />
              </div>
            </div>


            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold shadow-[var(--shadow-elegant)]">
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            
          </form>
        </div>
      </div>
    </div>
  );
}
