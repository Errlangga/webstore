# FC Mobile Store

Premium FC Mobile account storefront built with Next.js App Router, Neon Postgres, and Vercel Blob.

## Features
- Responsive landing page, stock catalogue, product detail pages, and testimonials.
- Password-protected admin dashboard for products, multi-image galleries, stock status, and testimonials.
- Product photos stored in Vercel Blob; product data stored in Neon.
- Checkout/contact via WhatsApp.

## Local setup
1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the variables.
3. Create the schema using `npm run db:setup` (requires `DATABASE_URL`).
4. Run `npm run dev`.

## Required environment variables
- `DATABASE_URL`: Neon pooled or standard Postgres connection string.
- `ADMIN_PASSWORD`: strong password for `/admin`.
- `SESSION_SECRET`: random long secret used to sign the admin session cookie.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token, required for image uploads.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: optional WhatsApp number in international format, digits only (e.g. `6281234567890`).
- `NEXT_PUBLIC_SITE_URL`: canonical public URL for robots.txt and sitemap (set this to the actual production domain).

Never commit `.env.local` or production secrets. Configure secrets in the Vercel project environment settings. Use genuine buyer testimonials only, and replace any demo content before launch.
