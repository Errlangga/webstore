"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal, coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <section className="admin-login-card">
        <Link href="/" className="brand"><span className="brand-mark">OVR<span>+</span></span><span className="brand-copy"><b>OVR MARKET</b><small>STORE CONTROL / ADMIN</small></span></Link>
        <div className="eyebrow" style={{ marginTop: 31 }}><span className="eyebrow-dot" /> RESTRICTED AREA</div>
        <h1>Admin sign in.</h1>
        <p>Masuk untuk mengelola katalog akun, galeri foto, stok, dan testimoni yang tampil di store.</p>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        <form className="admin-form" onSubmit={submit}>
          <label className="form-field"><span>Admin password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={1} placeholder="Masukkan password admin" /></label>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Memeriksa..." : "Masuk dashboard"} <span>↗</span></button>
        </form>
        <p className="admin-subnote">Cookie sesi dilindungi HttpOnly dan berlaku selama 12 jam. Jangan bagikan password admin.</p>
      </section>
    </div>
  );
}
