"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginNotice = "not-authorized" | "admin-setup-required" | "sign-in-required" | null;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<LoginNotice>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("error");
    if (value === "not-authorized" || value === "admin-setup-required" || value === "sign-in-required") {
      setNotice(value);
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    const { error: signOutError } = await createClient().auth.signOut();
    setSigningOut(false);
    if (signOutError) {
      setError(`Unable to sign out: ${signOutError.message}`);
      return;
    }
    setNotice("sign-in-required");
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--navy)" }}>
      <form
        onSubmit={submit}
        className="admin-card"
        style={{ width: "min(460px, calc(100% - 32px))" }}
      >
        <div className="eyebrow">USPF CONTENT MANAGEMENT</div>
        <h1>Owner sign in</h1>
        <p style={{ color: "var(--muted)" }}>Sign in to manage public website content.</p>

        {notice === "not-authorized" && (
          <div role="alert" className="my-5 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">This account is signed in, but it is not approved as a USPF website administrator.</p>
            <p>Ask the Supabase project owner to add this account’s Auth user UUID to <code>public.website_admins</code>:</p>
            <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
              <code>{"insert into public.website_admins (user_id) values ('<AUTH_USER_UUID>');"}</code>
            </pre>
            <p>Only an authorized project owner should run this SQL. If the website migration has not been applied, apply it first.</p>
          </div>
        )}

        {notice === "admin-setup-required" && (
          <div role="alert" className="my-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            Administrator access could not be verified. Ask the project owner to apply the website-management migration and check the Supabase connection and RLS policies.
          </div>
        )}

        {notice === "sign-in-required" && (
          <p role="status" className="my-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Sign in with an approved USPF administrator account to continue.
          </p>
        )}

        <label htmlFor="email">Email address</label>
        <input
          id="email"
          className="field"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="field"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
        <button className="admin-button" disabled={busy || signingOut}>
          {busy ? "Signing in..." : "Sign in securely"}
        </button>

        {notice === "not-authorized" && (
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy || signingOut}
            className="mt-4 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out to use another account"}
          </button>
        )}

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20 }}>
          Access is limited to Supabase users explicitly approved in the USPF website administrator allowlist.
        </p>
      </form>
    </main>
  );
}
