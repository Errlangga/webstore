"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

type SortOption = "newest" | "price-asc" | "price-desc";
type SellerFilter = "all" | "member" | "admin";

export default function StockGrid({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [seller, setSeller] = useState<SellerFilter>("all");
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))], [products]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const min = priceMin.trim() === "" ? null : Number(priceMin);
    const max = priceMax.trim() === "" ? null : Number(priceMax);
    return products.filter((product) => {
      const matchSearch = !keyword || [product.title, product.category, product.players, product.description, product.seller_username]
        .some((value) => (value || "").toLowerCase().includes(keyword));
      const matchCategory = category === "Semua" || product.category === category;
      const matchMinimum = min === null || (Number.isFinite(min) && Number(product.price) >= min);
      const matchMaximum = max === null || (Number.isFinite(max) && Number(product.price) <= max);
      const matchSeller = seller === "all" || (seller === "member" ? product.source === "member" : product.source !== "member");
      return matchSearch && matchCategory && matchMinimum && matchMaximum && matchSeller;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, search, category, priceMin, priceMax, sortBy, seller]);

  const hasFilters = Boolean(search || category !== "Semua" || priceMin || priceMax || seller !== "all" || sortBy !== "newest");
  function resetFilters() {
    setSearch("");
    setCategory("Semua");
    setPriceMin("");
    setPriceMax("");
    setSortBy("newest");
    setSeller("all");
  }

  return (
    <>
      <div className="catalog-toolbar">
        <div className="catalog-search-row">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama akun, OVR, pemain, atau seller..." aria-label="Cari akun" /><kbd>/</kbd></label>
          <label className="catalog-control"><span>Urutkan</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}><option value="newest">Terbaru</option><option value="price-asc">Harga termurah</option><option value="price-desc">Harga termahal</option></select></label>
        </div>
        <div className="catalog-advanced-filters">
          <label className="catalog-control"><span>Harga minimum (Rp)</span><input type="number" min="0" step="1000" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} placeholder="0" /></label>
          <label className="catalog-control"><span>Harga maksimum (Rp)</span><input type="number" min="0" step="1000" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} placeholder="Tanpa batas" /></label>
          <label className="catalog-control"><span>Penjual</span><select value={seller} onChange={(event) => setSeller(event.target.value as SellerFilter)}><option value="all">Semua penjual</option><option value="member">Seller member</option><option value="admin">Official store</option></select></label>
        </div>
        <div className="filter-chips" aria-label="Filter kategori">{categories.map((item) => <button type="button" key={item} className={category === item ? "filter-chip active" : "filter-chip"} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>
      <div className="catalog-results-row" aria-live="polite"><span>Menampilkan <strong>{filtered.length}</strong> dari <strong>{products.length}</strong> akun tersedia</span>{hasFilters && <button type="button" className="text-link" onClick={resetFilters}>Reset filter ×</button>}</div>
      {filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={`${product.source || "admin"}-${product.id}`} product={product} />)}</div> : (
        <div className="empty-state"><span className="empty-icon">⌕</span><h3>{products.length ? "Akun tidak ditemukan" : "Katalog sedang disiapkan"}</h3><p>{products.length ? "Tidak ada akun yang cocok dengan kombinasi filter ini. Coba kata kunci, rentang harga, atau kategori lain." : "Stok akun akan muncul di sini setelah admin atau member menambahkan katalog."}</p>{products.length > 0 && <button className="button button-secondary" onClick={resetFilters}>Reset filter</button>}</div>
      )}
    </>
  );
}
