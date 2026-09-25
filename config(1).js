// ====== KONFIGURACJA — UZUPEŁNIJ SWOIMI DANYMI ======
// 1) Adres i klucz "anon" znajdziesz w Supabase: Project Settings -> API
const SUPABASE_URL = "https://tkgypoyfgvbmlkryimzd.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrZ3lwb3lmZ3ZibWxrcnlpbXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzI1MTcsImV4cCI6MjEwNTkwODUxN30.cS5MCl-SxuaIOJZyzpGnpWv4RG8x-saE1ENMShNMgek";

// 2) Site key z Cloudflare Turnstile: dash.cloudflare.com -> Turnstile -> Add site
const TURNSTILE_SITE_KEY = "0x4AAAAAAFDTcFm6sp-cterh";

// Limity — możesz zmienić, ale musisz też zaktualizować CHECK w supabase-schema.sql
const MAX_NICK_LEN = 14;
const MAX_CONTENT_LEN = 40;
