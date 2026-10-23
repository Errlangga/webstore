"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductDocument, ProductStatus } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

type MemberCatalog = {
  id: number;
  title: string;
  slug: string;
  price: number | string;
  description: string;
  category: string;
  players: string;
  seller_whatsapp: string;
  images: string[];
  documents: ProductDocument[];
  status: ProductStatus;
  created_at: string;
};

type CatalogForm = Omit<MemberCatalog, "id" | "slug" | "created_at">;
const emptyForm: CatalogForm = {
  title: "", price: "", description: "", category: "Akun FC Mobile", players: "",
  seller_whatsapp: "", images: [], documents: [], status: "available",
};

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    throw new Error(typeof data.error === "string" ? data.error : "Permintaan gagal. Coba lagi.");
  }
  return data;
}

export default function MyCatalogDashboard({ username }: { username: string }) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<MemberCatalog[]>([]);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalogs = useCallback(async () => {
    try {
      const data = await readResponse(await fetch("/api/user/catalogs", { cache: "no-store" }));
      setCatalogs(Array.isArray(data.catalogs) ? data.catalogs : []);
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") {
        router.replace("/account?mode=login");
        return;
      }
      setError(err instanceof Error ? err.message : "Katalog gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadCatalogs(); }, [loadCatalogs]);

  function updateForm<K extends keyof CatalogForm>(key: K, value: CatalogForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function startEdit(item: MemberCatalog) {
    setEditingId(item.id);
    setForm({
      title: item.title, price: String(item.price), description: item.description,
      category: item.category || "Akun FC Mobile", players: item.players || "",
      seller_whatsapp: item.seller_whatsapp || "", images: Array.isArray(item.images) ? item.images : [],
      documents: Array.isArray(item.documents) ? item.documents : [], status: item.status,
    });
    setImageFiles([]);
    setDocumentFiles([]);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFiles([]);
    setDocumentFiles([]);
    setError("");
    if (typeof document !== "undefined") {
      const imageInput = document.getElementById("member-catalog-images") as HTMLInputElement | null;
      const documentInput = document.getElementById("member-catalog-documents") as HTMLInputElement | null;
      if (imageInput) imageInput.value = "";
      if (documentInput) documentInput.value = "";
    }
  }

  async function upload(file: File, kind: "image" | "document") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const data = await readResponse(await fetch("/api/user/upload", { method: "POST", body: formData }));
    return data as { url: string; name: string; contentType: string; size: number };
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (!editingId && catalogs.length >= 3) throw new Error("Batas maksimal 3 katalog sudah tercapai. Edit atau hapus katalog lama dulu.");
      if (form.images.length + imageFiles.length > 10) throw new Error("Maksimal 10 foto per katalog.");
      if (form.documents.length + documentFiles.length > 10) throw new Error("Maksimal 10 dokumen per katalog.");
      if ([...imageFiles, ...documentFiles].some((file) => file.size > 4 * 1024 * 1024)) throw new Error("Maksimal ukuran setiap foto/dokumen adalah 4 MB.");

      const images = [...form.images];
      for (const file of imageFiles) images.push((await upload(file, "image")).url);
      const documents = [...form.documents];
      for (const file of documentFiles) {
        const fileData = await upload(file, "document");
        documents.push({ url: fileData.url, name: file.name, contentType: fileData.contentType, size: fileData.size });
      }

      const payload = { ...form, price: Number(form.price), images, documents };
      const response = await fetch(editingId ? `/api/user/catalogs/${editingId}` : "/api/user/catalogs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readResponse(response);
      setNotice(editingId ? "Katalog berhasil diperbarui." : "Katalog berhasil dibuat dan tampil di marketplace.");
      resetForm();
      await loadCatalogs();
      void data;
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") {
        router.replace("/account?mode=login");
      } else {
        setError(err instanceof Error ? err.message : "Katalog gagal disimpan.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteCatalog(item: MemberCatalog) {
    if (!window.confirm(`Hapus katalog "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError(""); setNotice("");
    try {
      await readResponse(await fetch(`/api/user/catalogs/${item.id}`, { method: "DELETE" }));
      if (editingId === item.id) resetForm();
      setNotice("Katalog berhasil dihapus.");
      await loadCatalogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Katalog gagal dihapus.");
    }
  }

  async function logout() {
    await fetch("/api/user/logout", { method: "POST" }).catch(() => {});
    router.replace("/account");
    router.refresh();
  }

  return (
    <div className="section-shell page-shell my-catalog-page">
      <div className="member-dashboard-head">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> MEMBER AREA / MY KATALOG</div>
          <h1>Halo, <span>{username}.</span></h1>
          <p>Kelola listing akun FC Mobile kamu. Maksimal 3 katalog aktif per akun.</p>
        </div>
        <div className="member-head-actions"><Link href="/stock" className="button button-ghost">Lihat marketplace ↗</Link><button type="button" className="small-button" onClick={logout}>Logout</button></div>
      </div>
      <div className="member-catalog-stats">
        <div><strong>{catalogs.length}/3</strong><span>Slot katalog</span></div>
        <div><strong>{catalogs.filter((item) => item.status === "available").length}</strong><span>Tersedia</span></div>
        <div><strong>{catalogs.filter((item) => item.status === "sold").length}</strong><span>Terjual</span></div>
      </div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {notice && <div className="admin-alert" role="status">{notice}</div>}
      <div className="member-catalog-layout">
        <section className="admin-panel member-catalog-form-panel">
          <div className="member-section-title"><div><span className="mini-label">{editingId ? "EDIT LISTING" : "BUAT LISTING BARU"}</span><h2>{editingId ? "Edit katalog" : "Katalog baru"}</h2></div><span className="admin-badge">{editingId ? "EDIT MODE" : `${Math.max(0, 3 - catalogs.length)} SLOT TERSISA`}</span></div>
          <form className="admin-form" onSubmit={save}>
            <label className="form-field"><span>Nama katalog / judul akun *</span><input required minLength={3} maxLength={140} value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Contoh: Akun OVR 117 Full Event" /></label>
            <div className="form-row">
              <label className="form-field"><span>Harga (Rupiah) *</span><input required type="number" min="0" max="999999999999" step="1" value={form.price} onChange={(e) => updateForm("price", e.target.value)} placeholder="500000" /></label>
              <label className="form-field"><span>Kategori</span><input maxLength={80} value={form.category} onChange={(e) => updateForm("category", e.target.value)} placeholder="Akun FC Mobile" /></label>
            </div>
            <label className="form-field"><span>Deskripsi akun *</span><textarea required minLength={5} maxLength={6000} rows={5} value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Ceritakan OVR, rank, item, dan detail penting lainnya." /></label>
            <label className="form-field"><span>Pemain unggulan (pisahkan dengan koma)</span><input maxLength={1200} value={form.players} onChange={(e) => updateForm("players", e.target.value)} placeholder="Mbappé, Messi, Ronaldo..." /></label>
            <label className="form-field"><span>Nomor WhatsApp seller *</span><input required inputMode="tel" autoComplete="tel" maxLength={24} value={form.seller_whatsapp} onChange={(e) => updateForm("seller_whatsapp", e.target.value)} placeholder="6281234567890" /><small className="form-hint">Pakai format internasional dan kode negara; contoh Indonesia diawali 62. Pembeli akan menghubungi nomor ini.</small></label>
            <label className="form-field"><span>Status katalog</span><select value={form.status} onChange={(e) => updateForm("status", e.target.value as ProductStatus)}><option value="available">Tersedia</option><option value="sold">Terjual</option></select></label>
            <label className="form-field"><span>Foto katalog (bisa pilih beberapa)</span><input id="member-catalog-images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} /><small className="form-hint">JPG, PNG, WEBP, AVIF. Maksimal 10 foto total dan 4 MB per file.</small></label>
            {form.images.length > 0 && <div className="member-existing-files"><span className="form-label">Foto tersimpan</span><div className="member-image-grid">{form.images.map((url, index) => <div className="member-existing-image" key={url}><img src={url} alt={`Foto katalog ${index + 1}`} /><button type="button" aria-label="Hapus foto" onClick={() => updateForm("images", form.images.filter((_, i) => i !== index))}>×</button></div>)}</div></div>}
            {imageFiles.length > 0 && <small className="form-hint">{imageFiles.length} foto baru dipilih: {imageFiles.map((file) => file.name).join(", ")}</small>}
            <label className="form-field"><span>Dokumen pendukung (opsional)</span><input id="member-catalog-documents" type="file" accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.pptx" multiple onChange={(e) => setDocumentFiles(Array.from(e.target.files || []))} /><small className="form-hint">PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, PPTX. Maksimal 10 dokumen total, 4 MB per file.</small></label>
            {form.documents.length > 0 && <div className="member-existing-files"><span className="form-label">Dokumen tersimpan ({form.documents.length})</span>{form.documents.map((doc, index) => <div className="member-doc-row" key={doc.url}><a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a><button type="button" className="small-button danger" onClick={() => updateForm("documents", form.documents.filter((_, i) => i !== index))}>Hapus</button></div>)}</div>}
            {documentFiles.length > 0 && <small className="form-hint">{documentFiles.length} dokumen baru dipilih: {documentFiles.map((file) => file.name).join(", ")}</small>}
            <div className="member-form-actions"><button type="submit" className="button button-primary" disabled={busy || (!editingId && catalogs.length >= 3)}>{busy ? "Menyimpan katalog..." : editingId ? "Simpan perubahan" : "Buat katalog"} <span>↗</span></button>{editingId && <button type="button" className="button button-ghost" onClick={resetForm} disabled={busy}>Batal edit</button>}</div>
          </form>
          <p className="member-form-disclaimer">Jangan masukkan password game, kode OTP, atau data sensitif ke deskripsi/dokumen publik. Gunakan kontak WhatsApp terpisah untuk berkomunikasi dengan pembeli.</p>
        </section>
        <section className="member-catalog-list-panel">
          <div className="member-section-title"><div><span className="mini-label">YOUR LISTINGS</span><h2>My Katalog</h2></div><span className="admin-badge">{catalogs.length} / 3</span></div>
          {loading ? <div className="admin-loading">Memuat katalog kamu…</div> : catalogs.length === 0 ? (
            <div className="admin-empty"><strong>Belum ada katalog.</strong><br />Buat katalog pertamamu melalui form ini. Listing akan ditampilkan di marketplace.</div>
          ) : (
            <div className="admin-list">{catalogs.map((item) => (
              <article className="admin-list-item member-list-item" key={item.id}>
                <div className="admin-list-thumb">{item.images?.[0] ? <img src={item.images[0]} alt="" /> : <strong>{item.title.slice(0,1).toUpperCase()}</strong>}</div>
                <div className="admin-list-info"><b>{item.title}</b><small>{formatRupiah(Number(item.price))} · {item.status === "available" ? "Tersedia" : "Terjual"}</small><small>{item.images?.length || 0} foto · {item.documents?.length || 0} dokumen</small><small>WhatsApp: {item.seller_whatsapp || "belum diisi"}</small><Link className="member-list-link" href={`/stock/${item.slug}`} target="_blank">Lihat di marketplace ↗</Link></div>
                <div className="admin-list-actions"><button type="button" className="small-button" onClick={() => startEdit(item)}>Edit</button><button type="button" className="small-button danger" onClick={() => void deleteCatalog(item)}>Hapus</button></div>
              </article>
            ))}</div>
          )}
        </section>
      </div>
    </div>
  );
}
