import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BookOpen, LoaderCircle, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — SnappyStudy AI" },
      { name: "description", content: "Sign in to create AI-powered study kits from your PDFs." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }
    await navigate({ to: "/" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    if (!result.redirected) await navigate({ to: "/" });
  };

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md animate-float-in">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-button)]">
            <Zap className="size-6" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Welcome to SnappyStudy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to turn your PDFs into focused study kits.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <Button variant="outline" size="xl" className="w-full" onClick={handleGoogle} disabled={loading}>
            <Sparkles /> Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR CONTINUE WITH EMAIL <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">{message}</p>}
            <Button variant="hero" size="xl" className="w-full" disabled={loading} type="submit">
              {loading ? <LoaderCircle className="animate-spin" /> : <BookOpen />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to SnappyStudy?" : "Already have an account?"}{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </Button>
          </p>
        </div>
      </section>
    </main>
  );
}