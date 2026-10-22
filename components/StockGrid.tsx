"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export default function StockGrid({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))], [products]);
  const filtered = products.filter((product) => {
    const keyword = search.toLowerCase();
    const matchSearch = [product.title, product.category, product.players, product.description].some((value) => (value || "").toLowerCase().includes(keyword));
    const matchCategory = category === "Semua" || product.category === category;
    return matchSearch && matchCategory;
  });
  return (
    <>
      <div className="catalog-toolbar">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari OVR, pemain, atau tipe akun..." aria-label="Cari akun" /><kbd>/</kbd></label>
        <div className="filter-chips" aria-label="Filter kategori">{categories.map((item) => <button key={item} className={category === item ? "filter-chip active" : "filter-chip"} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>
      {filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : (
        <div className="empty-state"><span className="empty-icon">⌕</span><h3>{products.length ? "Akun tidak ditemukan" : "Katalog sedang disiapkan"}</h3><p>{products.length ? "Coba kata kunci atau kategori lain." : "Stok akun akan muncul di sini setelah admin menambahkan katalog."}</p>{products.length > 0 && <button className="button button-secondary" onClick={() => { setSearch(""); setCategory("Semua"); }}>Reset filter</button>}</div>
      )}
    </>
  );
}
