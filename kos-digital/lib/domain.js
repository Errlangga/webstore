"use strict";

function datePlusMonthsMinusOneDay(dateValue, months) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
  if (!match) throw new Error("Tanggal harus berformat YYYY-MM-DD.");
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const source = new Date(Date.UTC(year, month, day));
  if (source.getUTCFullYear() !== year || source.getUTCMonth() !== month || source.getUTCDate() !== day) {
    throw new Error("Tanggal tidak valid.");
  }
  const count = Number(months);
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error("Durasi harus 1 sampai 12 bulan.");
  const targetMonth = month + count;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const anniversary = new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)));
  anniversary.setUTCDate(anniversary.getUTCDate() - 1);
  return anniversary.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(String(dateValue) + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: ¶»§q«^