"use client";

import { useState } from "react";

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="detail-cover-placeholder"><span>OVR MARKET</span><strong>{title.slice(0, 1).toUpperCase()}</strong><small>ACCOUNT SHOWCASE</small></div>;
  }
  return (
    <div className="gallery">
      <div className="gallery-main"><img src={images[active]} alt={`${title} — foto ${active + 1}`} /></div>
      {images.length > 1 && <div className="gallery-thumbs">{images.map((src, index) => (
        <button key={src + index} className={active === index ? "gallery-thumb active" : "gallery-thumb"} onClick={() => setActive(index)} aria-label={`Lihat foto ${index + 1}`}><img src={src} alt="" /></button>
      ))}</div>}
    </div>
  );
}
