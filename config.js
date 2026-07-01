// ============================================================
// KONFIGURASI SUPABASE
// ============================================================
// File ini SENGAJA dipisah dari script.js agar mudah diganti
// tanpa menyentuh logic utama, dan agar bisa di-.gitignore
// jika repo GitHub kamu publik.
//
// Catatan: SUPA_KEY di bawah adalah "anon key" Supabase, bukan
// service_role key. Anon key memang didesain untuk dipakai di
// sisi client/browser dan AMAN untuk publik selama Row Level
// Security (RLS) sudah kamu aktifkan di tabel Supabase-nya.
// ============================================================

const SUPA_URL = 'https://pxuyryeenmrdlofaolkk.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dXlyeWVlbm1yZGxvZmFvbGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTY2NTYsImV4cCI6MjA5NzczMjY1Nn0.DJJxV1HfQDCtNhB1A8Do1peAvruYJSfF_ubCxpxRJfw';
