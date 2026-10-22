"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { whatsappUrl } from "@/lib/format";
import WhatsAppIcon from "@/components/WhatsAppIcon";

export default function WhatsAppFloat() {
  const pathname = usePathname();
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/store-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && typeof data?.whatsapp_number === "string") setWhatsappNumber(data.whatsapp_number); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (pathname.startsWith("/admin")) return null;

  const href = whatsappUrl("Halo admin Astra Market FC Mobile, saya ingin bertanya tentang akun FC Mobile.", whatsappNumber);

  return (
    <a
      className="whatsapp-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat Astra Market FC Mobile melalui WhatsApp"
      title="Chat melalui WhatsApp"
    >
      <span className="whatsapp-float-icon"><WhatsAppIcon /></span>
      <span className="whatsapp-float-copy"><strong>WhatsApp</strong><small>Chat admin</small></span>
      <span className="whatsapp-float-arrow" aria-hidden="true">↗</span>
    </a>
  );
}
