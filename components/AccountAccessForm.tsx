"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "register" | "login";

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Permintaan gagal. Coba lagi.");
  return data;
}

export default function AccountAccessForm({ initialMode = "register", nextPath = "/" }: { initialMode?: Mode; nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await readResponse(await fetch(mode === "register" ? "/api/user/register" : "/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }));
      setNotice(mode === "register" ? "Akun berhasil dibuat. Selamat datang!" : "Login berhasil.");
      setPassword("");
      router.replace(nextPath);
      router.refresh();
      void data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permintaan gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-access-page section-shell">
      <section className="account-access-card">
        <div className="eyebrow"><span className="eyebrow-dot" /> ASTRA MARKET / MEMBER AREA</div>
        <div className="account-access-logo"><span>A</span><small>FC MOBILE MARKETPLACE</small></div>
        <h1>{mode === "register" ? <>Buat akun.<br /><span>Mulai listing.</span></> : <>Balik lagi.<br /><span>Masuk dulu.</span></>}</h1>
        <p className="account-access-description">
          {mode === "register"
            ? "Buat akun member untuk memasang katalog akun FC Mobile kamu sendiri. Satu akun bisa punya maksimal 3 katalog."
            : "Masuk ke akun member untuk mengelola katalog dan melihat listing yang kamu pasang."}
        </p>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {notice && <div className="admin-alert" role="status">{notice}</div>}
        <form className="admin-form" onSubmit={submit}>
          <label className="form-field"><span>Username</span><input autoComplete="username" minLength={3} maxLength={24} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="contoh: bagus_fc" required pattern="[A-Za-z0-9_.-]{3,24}" title="3–24 karakter: huruf, angka, titik, garis bawah, atau tanda hubung" /></label>
          <label className="form-field"><span>Password</span><input autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" required /></label>
          {mode === "register" && <small className="form-hint">Username tidak bisa diubah. Password disimpan dalam bentuk hash aman, bukan teks asli. Simpan password kamu sendiri karena belum ada fitur pemulihan akun otomatis.</small>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Memproses..." : mode === "register" ? "Buat akun member" : "Login ke akun"} <span>↗</span></button>
        </form>
        <div className="account-mode-switch">
          <span>{mode === "register" ? "Sudah punya akun?" : "Belum punya akun?"}</span>
          <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); setNotice(""); }}>
            {mode === "register" ? "Login di sini" : "Buat akun"}
          </button>
        </div>
        <div className="account-access-foot"><span>01 / MEMBER ACCESS</span><Link href="/cari-akun">Cari akun ↗</Link></div>
      </section>
      <aside className="account-access-aside">
        <div className="aside-orbit" />
        <div className="aside-index">ASTRA MARKET / FC MOBILE</div>
        <h2>Jual akun.<br /><span>Atur katalogmu.</span></h2>
        <div className="aside-benefit"><b>01</b><div><strong>Maksimal 3 katalog</strong><small>Tambah, edit, atau hapus kapan saja.</small></div></div>
        <div className="aside-benefit"><b>02</b><div><strong>Nomor seller sendiri</strong><small>Pembeli langsung menghubungi seller yang dicantumkan.</small></div></div>
        <div className="aside-benefit"><b>03</b><div><strong>Kontak rekber</strong><small>Hubungi admin untuk jasa rekening bersama / midman.</small></div></div>
      </aside>
    </div>
  );
}
