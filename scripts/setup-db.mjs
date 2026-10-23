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
    seller_whatsapp TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
    documents JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(documents) = 'array'),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb`;
await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_whatsapp TEXT NOT NULL DEFAULT ''`;
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
await sql`
  CREATE TABLE IF NOT EXISTS store_settings (
    key VARCHAR(80) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    fingerprint CHAR(64) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS admin_login_attempts_fingerprint_time_idx ON admin_login_attempts (fingerprint, attempted_at DESC)`;
await sql`
  CREATE TABLE IF NOT EXISTS admin_credentials (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS user_accounts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(24) NOT NULL,
    username_normalized VARCHAR(24) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_accounts_username_shape CHECK (username ~ '^[A-Za-z0-9_.-]{3,24}
)
  )
`;
await sql`
  CREATE TABLE IF NOT EXISTS user_catalogs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    title VARCHAR(140) NOT NULL,
    slug VARCHAR(190) NOT NULL UNIQUE,
    price BIGINT NOT NULL CHECK (price >= 0),
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(80) NOT NULL DEFAULT 'Akun FC Mobile',
    players TEXT NOT NULL DEFAULT '',
    seller_whatsapp TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
    documents JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(documents) = 'array'),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS user_catalogs_user_created_idx ON user_catalogs (user_id, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS user_catalogs_status_created_idx ON user_catalogs (status, created_at DESC)`;
await sql`
  CREATE TABLE IF NOT EXISTS user_auth_attempts (
    id BIGSERIAL PRIMARY KEY,
    fingerprint CHAR(64) NOT NULL,
    action VARCHAR(20) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS user_auth_attempts_window_idx ON user_auth_attempts (fingerprint, action, attempted_at DESC)`;
await sql`
  CREATE OR REPLACE FUNCTION enforce_three_catalogs_per_user()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $function$
  DECLARE
    existing_count INTEGER;
  BEGIN
    PERFORM pg_advisory_xact_lock(NEW.user_id);
    SELECT COUNT(*) INTO existing_count
    FROM user_catalogs
    WHERE user_id = NEW.user_id AND id <> COALESCE(NEW.id, 0);
    IF existing_count >= 3 THEN
      RAISE EXCEPTION 'USER_CATALOG_LIMIT' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END;
  $function$
`;
await sql`DROP TRIGGER IF EXISTS user_catalog_limit_guard ON user_catalogs`;
await sql`
  CREATE TRIGGER user_catalog_limit_guard
  BEFORE INSERT OR UPDATE OF user_id ON user_catalogs
  FOR EACH ROW EXECUTE FUNCTION enforce_three_catalogs_per_user()
`;

await sql`
  CREATE TABLE IF NOT EXISTS catalog_uploads (
    id BIGSERIAL PRIMARY KEY,
    blob_url TEXT NOT NULL UNIQUE,
    uploader_type VARCHAR(12) NOT NULL CHECK (uploader_type IN ('admin', 'member')),
    user_id BIGINT REFERENCES user_accounts(id) ON DELETE CASCADE,
    file_kind VARCHAR(12) NOT NULL CHECK (file_kind IN ('image', 'document')),
    byte_size BIGINT NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
    attached BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((uploader_type = 'admin' AND user_id IS NULL) OR (uploader_type = 'member' AND user_id IS NOT NULL))
  )
`;
await sql`CREATE INDEX IF NOT EXISTS catalog_uploads_member_idx ON catalog_uploads (user_id, created_at DESC) WHERE uploader_type = 'member'`;
await sql`CREATE INDEX IF NOT EXISTS catalog_uploads_capacity_idx ON catalog_uploads (uploader_type, user_id, attached, file_kind, created_at DESC)`;
await sql`
  INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
  SELECT DISTINCT image.url, 'member', c.user_id, 'image', 0, true
  FROM user_catalogs c
  CROSS JOIN LATERAL jsonb_array_elements_text(c.images) image(url)
  WHERE image.url LIKE 'https://%.blob.vercel-storage.com/%'
  ON CONFLICT (blob_url) DO NOTHING
`;
await sql`
  INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
  SELECT DISTINCT doc.item->>'url', 'member', c.user_id, 'document', 0, true
  FROM user_catalogs c
  CROSS JOIN LATERAL jsonb_array_elements(c.documents) doc(item)
  WHERE doc.item->>'url' LIKE 'https://%.blob.vercel-storage.com/%'
  ON CONFLICT (blob_url) DO NOTHING
`;
await sql`
  INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
  SELECT DISTINCT image.url, 'admin', NULL, 'image', 0, true
  FROM products p
  CROSS JOIN LATERAL jsonb_array_elements_text(p.images) image(url)
  WHERE image.url LIKE 'https://%.blob.vercel-storage.com/%'
  ON CONFLICT (blob_url) DO NOTHING
`;
await sql`
  INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
  SELECT DISTINCT doc.item->>'url', 'admin', NULL, 'document', 0, true
  FROM products p
  CROSS JOIN LATERAL jsonb_array_elements(p.documents) doc(item)
  WHERE doc.item->>'url' LIKE 'https://%.blob.vercel-storage.com/%'
  ON CONFLICT (blob_url) DO NOTHING
`;
await sql`
  INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
  SELECT DISTINCT image_url, 'admin', NULL, 'image', 0, true
  FROM testimonials
  WHERE image_url LIKE 'https://%.blob.vercel-storage.com/%'
  ON CONFLICT (blob_url) DO NOTHING
`;
await sql`
  INSERT INTO catalog_uploads (blob_url, uploader_type, user_id, file_kind, byte_size, attached)
  SELECT DISTINCT value, 'admin', NULL, 'image', 0, true
  FROM store_settings
  WHERE key IN ('hero_card_image_1', 'hero_card_image_2', 'fc_mobile_logo_image')
    AND value LIKE 'https://%.blob.vercel-storage.com/%'
  ON CONFLICT (blob_url) DO NOTHING
`;

console.log("Neon schema ready: admin, store settings, member accounts, member catalogs, upload registry/quotas, and testimonials.");
