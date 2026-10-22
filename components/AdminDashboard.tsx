"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductDocument, Testimonial, ProductStatus } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

type ProductForm = {
  title: string;
  price: string;
  description: string;
  category: string;
  players: string;
  status: ProductStatus;
  featured: boolean;
  images: string[];
  documents: ProductDocument[];
};

const blankProduct: ProductForm = {
  title: "", price: "", description: "", category: "Akun FC Mobile",
  players: "", status: "available", featured: false, images: [], documents: [],
};

async function responseData(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request gagal.");
  return data;
}

export default function AdminDashboard() {
  const router = useRouter();
  const productFileRef = useRef<HTMLInputElement>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"products" | "testimonials" | "security" | "settings">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("5");
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productResponse, testimonialResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/admin/testimonials", { cache: "no-store" }),
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);
      if (productResponse.status === 401 || testimonialResponse.status === 401 || settingsResponse.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const productData = await responseData(productResponse);
      const testimonialData = await responseData(testimonialResponse);
      const settingsData = await responseData(settingsResponse);
      setProducts(productData.products || []);
      setTestimonials(testimonialData.testimonials || []);
      setWhatsappNumber(settingsData.settings?.whatsapp_number || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadData(); }, [loadData]);

  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetProductForm() {
    setForm(blankProduct);
    setEditingId(null);
    setProductFiles([]);
    setDocumentFiles([]);
    if (productFileRef.current) productFileRef.current.value = "";
    if (documentFileRef.current) documentFileRef.current.value = "";
  }

  function startEdit(product: Product) {
    setTab("products");
    setEditingId(Number(product.id));
    setForm({
      title: product.title,
      price: String(product.price),
      description: product.description || "",
      category: product.category || "Akun FC Mobile",
      players: product.players || "",
      status: product.status,
      featured: product.featured,
      images: product.images || [],
      documents: product.documents || [],
    });
    setProductFiles([]);
    setDocumentFiles([]);
    if (productFileRef.current) productFileRef.current.value = "";
    if (documentFileRef.current) documentFileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function upload(file: File, kind: "image" | "document" = "image") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
    return await responseData(response) as { url: string; name: string; contentType: string; size: number };
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (productFiles.some((file) => file.size > 4 * 1024 * 1024)) {
        throw new Error("Setiap foto maksimal 4 MB.");
      }
      if (form.images.length + productFiles.length > 10) {
        throw new Error("Maksimal 10 foto untuk satu produk.");
      }
      if (documentFiles.some((file) => file.size > 8 * 1024 * 1024)) {
        throw new Error("Setiap dokumen maksimal 8 MB.");
      }
      if (form.documents.length + documentFiles.length > 10) {
        throw new Error("Maksimal 10 dokumen untuk satu produk.");
      }
      const uploaded: string[] = [];
      for (const file of productFiles) uploaded.push((await upload(file, "image")).url);
      const uploadedDocuments: ProductDocument[] = [];
      for (const file of documentFiles) {
        const uploadedDocument = await upload(file, "document");
        uploadedDocuments.push({ url: uploadedDocument.url, name: file.name, contentType: uploadedDocument.contentType, size: uploadedDocument.size });
      }
      const payload = { ...form, price: Number(form.price), images: [...form.images, ...uploaded], documents: [...form.documents, ...uploadedDocuments] };
      const response = await fetch("/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      await responseData(response);
      resetProductForm();
      setNotice(editingId ? "Perubahan produk tersimpan." : "Produk baru berhasil ditambahkan.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Produk gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(id: number) {
    if (!window.confirm("Hapus produk ini dari katalog?")) return;
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      await responseData(response);
      if (editingId === id) resetProductForm();
      setNotice("Produk dihapus dari katalog.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Produk gagal dihapus.");
    }
  }

  async function toggleStatus(product: Product) {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, id: Number(product.id), status: product.status === "available" ? "sold" : "available" }),
      });
      await responseData(response);
      setNotice("Status stok diperbarui.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status stok gagal diperbarui.");
    }
  }

  async function saveTestimonial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const image_url = proofFile ? await upload(proofFile) : null;
      const response = await fetch("/api/admin/testimonials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_name: buyerName, product_title: productTitle, message, rating: Number(rating), image_url, visible }),
      });
      await responseData(response);
      setBuyerName(""); setProductTitle(""); setMessage(""); setRating("5"); setVisible(true); setProofFile(null);
      if (proofFileRef.current) proofFileRef.current.value = "";
      setNotice("Testimoni berhasil ditambahkan.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Testimoni gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTestimonial(item: Testimonial) {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/testimonials", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(item.id), visible: !item.visible }),
      });
      await responseData(response);
      setNotice(item.visible ? "Testimoni disembunyikan." : "Testimoni dipublikasikan.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status testimoni gagal diubah.");
    }
  }

  async function removeTestimonial(id: number) {
    if (!window.confirm("Hapus testimoni ini?")) return;
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/testimonials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      await responseData(response);
      setNotice("Testimoni dihapus.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Testimoni gagal dihapus.");
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change", currentPassword, newPassword, confirmPassword }),
      });
      const data = await responseData(response);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setNotice(data.message || "Password berhasil diubah.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password gagal diubah.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!window.confirm("Reset password admin ke password awal yang dikonfigurasi di Vercel?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await responseData(response);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setNotice(data.message || "Password dikembalikan ke password awal.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password gagal direset.");
    } finally {
      setBusy(false);
    }
  }

  async function saveWhatsApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: whatsappNumber }),
      });
      const data = await responseData(response);
      setWhatsappNumber(data.settings?.whatsapp_number || "");
      setNotice(data.message || "Pengaturan store berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengaturan store gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <div className="admin-topline">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> STORE CONTROL CENTER</div><h1>Admin dashboard.</h1><p>Kelola katalog, foto, status stok, dan feedback pembeli.</p></div>
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}><a href="/" className="small-button">Lihat store ↗</a><button type="button" className="small-button" onClick={logout}>Keluar</button></div>
      </div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {notice && <div className="admin-alert" role="status">{notice}</div>}
      <div className="admin-tabs" role="tablist">
        <button className={tab === "products" ? "admin-tab active" : "admin-tab"} onClick={() => { setTab("products"); setError(""); }} role="tab" aria-selected={tab === "products"}>Katalog akun ({products.length})</button>
        <button className={tab === "testimonials" ? "admin-tab active" : "admin-tab"} onClick={() => { setTab("testimonials"); setError(""); }} role="tab" aria-selected={tab === "testimonials"}>Testimoni ({testimonials.length})</button>
        <button className={tab === "security" ? "admin-tab active" : "admin-tab"} onClick={() => { setTab("security"); setError(""); }} role="tab" aria-selected={tab === "security"}>Keamanan akun</button>
        <button className={tab === "settings" ? "admin-tab active" : "admin-tab"} onClick={() => { setTab("settings"); setError(""); }} role="tab" aria-selected={tab === "settings"}>Pengaturan store</button>
      </div>

      {loading ? <div className="admin-loading">Memuat data dashboard...</div> : tab === "products" ? (
        <div className="admin-content-grid">
          <section className="admin-panel">
            <h2>{editingId ? "Edit akun" : "Tambah akun baru"}</h2>
            <form className="admin-form" onSubmit={saveProduct}>
              <label className="form-field"><span>Nama akun / judul</span><input required minLength={3} maxLength={140} value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Contoh: Squad OVR 140+" /></label>
              <div className="form-row">
                <label className="form-field"><span>Harga (Rupiah)</span><input required type="number" min="0" max="999999999999" step="1000" value={form.price} onChange={(e) => updateForm("price", e.target.value)} placeholder="350000" /></label>
                <label className="form-field"><span>Kategori</span><select value={form.category} onChange={(e) => updateForm("category", e.target.value)}><option>Akun FC Mobile</option><option>Squad OVR Tinggi</option><option>Akun Budget</option><option>Akun Rare</option><option>Bundle / Lainnya</option></select></label>
              </div>
              <label className="form-field"><span>Deskripsi</span><textarea required minLength={5} maxLength={6000} value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Jelaskan detail akun, OVR, rank, resource, bind, dan hal penting lain." /></label>
              <label className="form-field"><span>Pemain unggulan (pisahkan dengan koma)</span><input maxLength={1200} value={form.players} onChange={(e) => updateForm("players", e.target.value)} placeholder="Mbappé, Messi, Ronaldo..." /></label>
              <label className="form-field"><span>Foto katalog (bisa pilih beberapa)</span><input ref={productFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e) => setProductFiles(Array.from(e.target.files || []))} /><small className="form-hint">JPG, PNG, WEBP, AVIF. Maksimal 4 MB per foto dan total 10 foto. Foto dikirim ke Vercel Blob.</small></label>
              {form.images.length > 0 && <div><span className="form-label">Foto tersimpan ({form.images.length})</span><div className="gallery-thumbs">{form.images.map((src, index) => <button key={src} type="button" className="gallery-thumb" title="Hapus foto tersimpan" onClick={() => updateForm("images", form.images.filter((_, i) => i !== index))}><img src={src} alt={`Foto tersimpan ${index + 1}`} /></button>)}</div><small className="form-hint">Klik foto untuk menghapus dari daftar produk. File lama tetap tersimpan di Blob.</small></div>}
              {productFiles.length > 0 && <p className="form-hint">{productFiles.length} foto baru dipilih: {productFiles.map((file) => file.name).join(", ")}</p>}
              <label className="form-field"><span>Dokumen katalog (bisa pilih beberapa)</span><input ref={documentFileRef} type="file" accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.pptx,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple onChange={(e) => setDocumentFiles(Array.from(e.target.files || []))} /><small className="form-hint">PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, PPTX; maksimal 8 MB per dokumen dan 10 dokumen per akun. Jangan unggah password atau data sensitif.</small></label>
              {form.documents.length > 0 && <div><span className="form-label">Dokumen tersimpan ({form.documents.length})</span><div className="document-list">{form.documents.map((document, index) => <div className="document-item" key={document.url}><a href={document.url} target="_blank" rel="noreferrer">{document.name} ↗</a><button type="button" className="small-button danger" onClick={() => updateForm("documents", form.documents.filter((_, i) => i !== index))}>Hapus dari katalog</button></div>)}</div></div>}
              {documentFiles.length > 0 && <p className="form-hint">{documentFiles.length} dokumen baru dipilih: {documentFiles.map((file) => file.name).join(", ")}</p>}
              <label className="checkbox-field"><input type="checkbox" checked={form.featured} onChange={(e) => updateForm("featured", e.target.checked)} /> Tandai sebagai akun unggulan</label>
              <label className="form-field"><span>Status stok</span><select value={form.status} onChange={(e) => updateForm("status", e.target.value as ProductStatus)}><option value="available">Tersedia</option><option value="sold">Terjual</option></select></label>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah ke katalog"} <span>↗</span></button>
              {editingId && <button type="button" className="button button-secondary" onClick={resetProductForm}>Batal edit</button>}
            </form>
          </section>
          <section className="admin-panel">
            <h2>Listing katalog <span className="admin-badge">{products.length} akun</span></h2>
            {!products.length ? <div className="admin-empty">Belum ada akun. Tambahkan akun pertama melalui formulir ini.</div> : <div className="admin-list">{products.map((product) => <article className="admin-list-item" key={product.id}><div className="admin-list-thumb">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : "OVR"}</div><div className="admin-list-info"><b>{product.title}</b><small>{formatRupiah(Number(product.price))} · {product.status === "available" ? "Tersedia" : "Terjual"}{product.featured ? " · Featured" : ""}</small><small>{product.images?.length || 0} foto · {product.documents?.length || 0} dokumen · #{product.id}</small></div><div className="admin-list-actions"><button className="small-button" onClick={() => startEdit(product)}>Edit</button><button className="small-button" onClick={() => void toggleStatus(product)}>{product.status === "available" ? "Tandai terjual" : "Aktifkan stok"}</button><button className="small-button danger" onClick={() => void removeProduct(Number(product.id))}>Hapus</button></div></article>)}</div>}
          </section>
        </div>
      ) : tab === "testimonials" ? (
        <div className="admin-content-grid">
          <section className="admin-panel">
            <h2>Tambah testimoni</h2>
            <form className="admin-form" onSubmit={saveTestimonial}>
              <label className="form-field"><span>Nama pembeli</span><input required minLength={2} maxLength={100} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nama yang sudah memberi izin" /></label>
              <label className="form-field"><span>Produk / akun yang dibeli</span><input required minLength={2} maxLength={140} value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="Nama akun" /></label>
              <label className="form-field"><span>Isi testimoni</span><textarea required minLength={5} maxLength={2500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Gunakan ulasan asli dari pembeli dengan izin." /></label>
              <div className="form-row">
                <label className="form-field"><span>Rating</span><select value={rating} onChange={(e) => setRating(e.target.value)}><option value="5">5 / 5</option><option value="4">4 / 5</option><option value="3">3 / 5</option><option value="2">2 / 5</option><option value="1">1 / 5</option></select></label>
                <label className="form-field"><span>Bukti transaksi (opsional)</span><input ref={proofFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setProofFile(e.target.files?.[0] || null)} /></label>
              </div>
              <small className="form-hint">Sensor nomor HP, email, ID, password, dan data pribadi pada bukti sebelum upload. Unggah hanya dengan izin pembeli.</small>
              <label className="checkbox-field"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Langsung publikasikan testimoni</label>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan testimoni"} <span>↗</span></button>
            </form>
          </section>
          <section className="admin-panel">
            <h2>Feedback pembeli <span className="admin-badge">{testimonials.length} item</span></h2>
            {!testimonials.length ? <div className="admin-empty">Belum ada testimoni. Masukkan ulasan asli dan jangan membuat bukti transaksi palsu.</div> : <div className="admin-list">{testimonials.map((item) => <article className="admin-list-item" key={item.id}><div className="admin-list-thumb">{item.image_url ? <img src={item.image_url} alt="" /> : item.buyer_name.slice(0, 1).toUpperCase()}</div><div className="admin-list-info"><b>{item.buyer_name} · {"★".repeat(item.rating)}</b><small>{item.product_title}</small><small>{item.visible ? "Dipublikasikan" : "Disembunyikan"} · {item.message.slice(0, 75)}{item.message.length > 75 ? "…" : ""}</small></div><div className="admin-list-actions"><button className="small-button" onClick={() => void toggleTestimonial(item)}>{item.visible ? "Sembunyikan" : "Publikasikan"}</button><button className="small-button danger" onClick={() => void removeTestimonial(Number(item.id))}>Hapus</button></div></article>)}</div>}
          </section>
        </div>
      ) : tab === "security" ? (
        <div className="admin-content-grid">
          <section className="admin-panel">
            <h2>Ganti password admin</h2>
            <p>Gunakan password unik yang tidak dipakai di akun lain. Password disimpan dalam bentuk hash di database.</p>
            <form className="admin-form" onSubmit={changePassword}>
              <label className="form-field"><span>Password saat ini</span><input required type="password" autoComplete="current-password" minLength={1} maxLength={128} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label>
              <label className="form-field"><span>Password baru</span><input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter" /></label>
              <label className="form-field"><span>Konfirmasi password baru</span><input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : "Ganti password"} <span>↗</span></button>
            </form>
          </section>
          <section className="admin-panel">
            <h2>Reset password admin</h2>
            <p>Reset mengembalikan password ke password awal yang dikonfigurasi di Vercel.</p>
            <button type="button" className="button button-secondary" onClick={() => void resetPassword()} disabled={busy}>Reset ke password awal</button>
            <small className="form-hint">Gunakan opsi reset hanya bila diperlukan. Setelah reset, segera ganti lagi ke password pribadi.</small>
          </section>
        </div>
      ) : (
        <div className="admin-content-grid">
          <section className="admin-panel">
            <h2>Kontak WhatsApp store</h2>
            <p>Nomor ini digunakan oleh tombol WhatsApp di website dan tombol tanya admin pada detail akun.</p>
            <form className="admin-form" onSubmit={saveWhatsApp}>
              <label className="form-field"><span>Nomor WhatsApp (format internasional)</span><input inputMode="tel" autoComplete="tel" maxLength={24} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="6281234567890" aria-describedby="whatsapp-help" /></label>
              <small id="whatsapp-help" className="form-hint">Masukkan kode negara, misalnya 62 untuk Indonesia. Boleh memakai +, spasi, atau tanda hubung; sistem menyimpan angka saja. Kosongkan untuk menonaktifkan direct-to-admin.</small>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan nomor WhatsApp"} <span>↗</span></button>
            </form>
          </section>
          <section className="admin-panel">
            <h2>Informasi dokumen katalog</h2>
            <p>Setiap akun dapat memiliki hingga 10 dokumen publik. Format yang didukung: PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, dan PPTX.</p>
            <small className="form-hint">Maksimal 8 MB per dokumen. Jangan mengunggah kredensial akun, password, atau data pribadi pelanggan.</small>
          </section>
        </div>
      )}
    </div>
  );
}
