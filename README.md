# Astra Market FC Mobile

Astra Market FC Mobile account storefront built with Next.js App Router, Neon Postgres, and Vercel Blob.

## Features
- Responsive landing page, stock catalogue, product detail pages, and testimonials.
- Password-protected admin dashboard for products, multi-image galleries, stock status, testimonials, and account security (change/reset password).
- Product photos stored in Vercel Blob; product data stored in Neon.
- Checkout/contact via WhatsApp.

## Local setup
1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the variables.
3. Create the schema using `npm run db:setup` (requires `DATABASE_URL`).
4. Run `npm run dev`.

## Required environment variables
- `DATABASE_URL`: Neon pooled or standard Postgres connection string.
- `ADMIN_PASSWORD`: initial admin password used only to bootstrap the first credential and as the reset target. Set the initial admin password in Vercel as a sensitive environment variable, then change it from the dashboard after the first login. The active password is stored as a salted scrypt hash in Neon.
- `SESSION_SECRET`: recommended random secret (at least 32 characters) used to sign the admin session cookie. If unset, the app falls back to the Neon connection string.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token, required for image uploads.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: recommended WhatsApp number for direct-to-admin chat in international format, digits only (e.g. `6281234567890`).
- `NEXT_PUBLIC_SITE_URL`: canonical public URL for robots.txt and sitemap (set this to the actual production domain).

Never commit `.env.local` or production secrets. Configure secrets in the Vercel project environment settings. Password changes are stored in Neon; resetting restores the `ADMIN_PASSWORD` bootstrap value. Testimonial creation, photo uploads, edits to visibility, and deletion are restricted to an authenticated admin. Use genuine buyer testimonials only, with permission from the buyer.
