# Kos Digital

Portal digital sederhana untuk pemilik dan penyewa kos. Dibangun dengan Node.js serverless functions di Vercel dan PostgreSQL Neon.

## Fitur

- Login pemilik dan penyewa memakai session cookie HTTP-only, password hash scrypt, dan pembatasan percobaan login.
- Dashboard berbeda untuk admin dan penyewa.
- Data kamar, penghuni, harga sewa, dan tanggal kontrak.
- Tagihan sewa awal, riwayat pembayaran, status lunas/belum lunas, dan perpanjangan 1/2/3/6/12 bulan.
- Form keluhan dengan status menunggu, diproses, selesai, serta catatan admin.
- Pengaturan nama kos, alamat, harga sewa bulanan default, dan harga sewa awal.
- Audit log aktivitas penting.
- Integrasi QRIS Midtrans melalui charge API dan verifikasi webhook signature SHA-512.

## Environment variables Vercel

- `DATABASE_URL`: connection string database `kos_digital` pada branch Neon `kos-digital`.
- `SESSION_SECRET`: secret acak minimal 32 karakter.
- `MIDTRANS_SERVER_KEY`: Server Key merchant Midtrans, disimpan sebagai sensitive secret.
- `MIDTRANS_IS_PRODUCTION`: `false` untuk sandbox dan `true` untuk production.

Set `DATABASE_URL` dan `SESSION_SECRET` untuk Production dan Preview. Jangan commit rahasia ke GitHub.

## Mengaktifkan QRIS

1. Aktifkan merchant Midtrans dan pastikan metode QRIS tersedia pada akun.
2. Tambahkan Server Key sandbox ke `MIDTRANS_SERVER_KEY` di Vercel.
3. Set `MIDTRANS_IS_PRODUCTION=false` untuk transaksi uji sandbox.
4. Atur Payment Notification URL Midtrans ke `https://DOMAIN-¶»§q«^