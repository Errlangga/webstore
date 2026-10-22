import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diatur. Salin .env.example menjadi .env.local lalu isi connection string Neon.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(140) NOT NULL,
    slug VARCHAR(170) NOT NULL UNIQUE,
    price BIGINT NOT NULL CHECK (price >= 0),
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(80) NOT NULL DEFAULT 'Akun FC Mobile',
    players TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS products_status_created_idx ON products (status, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS products_featured_idx ON products (featured) WHERE featured = true`;
await sql`
  CREATE TABLE IF NOT EXISTS testimonials (
    id BIGSERIAL PRIMARY KEY,
    buyer_name VARCHAR(100) NOT NULL,
    product_title VARCHAR(140) NOT NULL,
    message TEXT NOT NULL,
    rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    image_url TEXT,
    visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS testimonials_visible_created_idx ON testimonials (visible, created_at DESC)`;
console.log("Neon schema ready: products, testimonials.");
