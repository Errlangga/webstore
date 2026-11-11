"use strict";

const crypto = require("node:crypto");
const { Pool } = require("pg");
const { datePlusMonthsMinusOneDay, addDays, todayJakarta } = require("../lib/domain");
let pool;
function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum dikonfigurasi.");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: true } });
    pool.on("error", e => console.error("Postgres pool:", e.message));
  }
  return pool;
}
function send(res, status, data) {
  res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(data));
}
function cookies(header) {
  const out = {};
  for (const item of String(header || "").split(";")) { const i = item.indexOf("="); if (i > 0) out[item.slice(0, i).trim()] = item.slice(i + 1).trim(); }
  return out;
}
function equal(a, b) { const x = Buffer.from(String(a || "")); const y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function cookie(res, value, age = 86400) { res.setHeader("Set-Cookie", `kos_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`); }
function sessionToken(user) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET minimal 32 karakter belum dikonfigurasi.");
  con¶»§q«^