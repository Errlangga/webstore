# Astra Market FC Mobile

Astra Market FC Mobile account storefront built with Next.js App Router, Neon Postgres, and Vercel Blob.

## Features
- Responsive landing page, stock catalogue, product detail pages, and testimonials.
- Password-protected admin dashboard for products, seller WhatsApp contacts, multi-image galleries, stock status, testimonials, visual settings, and account security (change/reset password).
- Product photos stored in Vercel Blob; product data stored in Neon.
- “Jasa Posting” CTA opens WhatsApp admin with a prefilled request message.
- Each catalog item can optionally specify a seller WhatsApp number; otherwise enquiries route to the store admin.
- Admin route prefix is configurable; direct `/admin` paths return 404 in production and the dashboard still requires a valid signed session.
- Admin login attempts are rate-limited to five attempts per IP fingerprint per 15-minute window.
- Member accounts use salted scrypt password hashes and signed HTTP-only sessions.
- Members can publish, edit, or delete up to 3 catalog listings per account; their listings appear in the public marketplace and WhatsApp contact routes to the seller.
- “Jasa Rekber / Midman” opens a prefilled WhatsApp message to store admin; it is a contact flow, not an automated escrow/payment processor.
- Up to 10 public document attachments per listing (PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, PPTX), 4 MB each.

## Local setup
1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the variables.
3. Create the schema using `npm run db:setup` (requires `DATABASE_URL`).
4. Run `npm run dev`.

## Member accounts
- First-time visitors to the homepage are sent to `/account` to register or log in. Usernames are unique and 3–24 characters; passwords must be 8–128 characters. Password recovery is not automatic, so members should keep their credentials safe.
- Members manage their own listings at `/my-katalog`. The limit of three listings is checked by the API and a database trigger.

## Required environment variables
- `DATABASE_URL`: Neon pooled or standard Postgres connection string.
- `ADMIN_PASSWORD`: initial admin password used only to bootstrap the first credential and as the reset target. Set it as a sensitive Vercel environment variable, then change it from the dashboard after the first login. The active password is stored as a salted scrypt hash in Neon.
- `ADMIN_DASHBOARD_PATH`: private admin route prefix in production, for example a long, random path segment. `/admin` is deliberately blocked in production.
- `NEXT_PUBLIC_ADMIN_DASHBOARD_PATH`: set to the same path as `ADMIN_DASHBOARD_PATH` so browser-side redirects reach the configured admin login page. The custom path is only an extra layer; never rely on obscurity instead of the password/session checks.
- After changing either admin path variable in Vercel, redeploy the project so the server route proxy and client-side redirects use the same configured value. Keep the production login URL private; server-side session validation remains mandatory.
- `SESSION_SECRET`: recommended random secret (at least 32 characters) used to sign the admin session cookie. If unset, the app falls back to the Neon connection string.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token, required for image uploads.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: recommended WhatsApp number for direct-to-admin chat in international format, digits only (e.g. `6281234567890`).
- `NEXT_PUBLIC_SITE_URL`: canonical public URL for robots.txt and sitemap (set this to the actual production domain).

Never commit `.env.local` or production secrets. Configure secrets in the Vercel project environment settings. Password changes are stored in Neon; resetting restores the `ADMIN_PASSWORD` bootstrap value. Testimonial creation, photo uploads, edits to visibility, and deletion are restricted to an authenticated admin. Use genuine buyer testimonials only, with permission from the buyer.
