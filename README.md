# Spotted — instrukcja uruchomienia

Strona to zwykłe pliki HTML/CSS/JS (frontend) + Supabase jako baza danych i logowanie adminów (backend), oraz Cloudflare Turnstile jako captcha. Wszystko za darmo.

## 1. Załóż projekt w Supabase
1. Wejdź na supabase.com, załóż darmowe konto, kliknij **New project**.
2. Poczekaj aż projekt się utworzy (ok. 2 min).
3. Wejdź w **SQL Editor** → **New query**, wklej całą zawartość pliku `supabase-schema.sql` z tego folderu i kliknij **Run**. To tworzy tabelę na wpisy i reguły dostępu (RLS).
4. Wejdź w **Project Settings → API**. Skopiuj:
   - `Project URL` → wklej do `config.js` jako `SUPABASE_URL`
   - `anon public` key → wklej do `config.js` jako `SUPABASE_ANON_KEY`

## 2. Załóż konto administratora
1. W Supabase wejdź w **Authentication → Users → Add user**.
2. Podaj e-mail i hasło administratora (możesz dodać kilku administratorów — każdy dostaje osobne konto).
3. To hasło będzie służyć do logowania w `admin.html`. Nie musisz nic więcej konfigurować — reguła w bazie mówi „usuwać może każdy zalogowany", więc każde konto z Supabase Auth jest kontem admina.

## 3. Załóż darmową captchę (Cloudflare Turnstile)
1. Wejdź na dash.cloudflare.com → **Turnstile** → **Add a site**.
2. Podaj domenę, pod którą wystawisz stronę (np. `twojanazwa.github.io`).
3. Skopiuj **Site Key** → wklej do `config.js` jako `TURNSTILE_SITE_KEY`.
   (Secret Key nie jest tu potrzebny, bo captcha jest weryfikowana tylko po stronie przeglądarki — patrz sekcja "Mocniejsza ochrona" niżej.)

## 4. Wystaw stronę na GitHub Pages
1. Załóż nowe, **publiczne** repozytorium na GitHub, np. `spotted-szkola`.
2. Wrzuć do niego wszystkie pliki z tego folderu (`index.html`, `admin.html`, `regulamin.html`, `changelog.html`, `style.css`, `app.js`, `config.js`).
   - **Nie wrzucaj** `supabase-schema.sql` jeśli wolisz nie pokazywać struktury bazy publicznie (nie jest to konieczne do działania strony).
3. Wejdź w **Settings → Pages**, w sekcji "Build and deployment" wybierz branch `main` i folder `/ (root)`, zapisz.
4. Po chwili strona będzie dostępna pod `https://twoja-nazwa.github.io/spotted-szkola/`.

Podmień w Cloudflare Turnstile domenę na dokładnie ten adres, jeśli się różni od tego, co podałeś w kroku 3.

## Personalizacja
- Zmień „[Nazwa Szkoły]" w `index.html` (tag `<title>` i `<h1>`).
- Kolory i fonty są w `style.css` (zmienne na górze pliku w `:root`).
- Limity znaków (14 dla ksywki, 40 dla wpisu) są w `config.js` — jeśli je zmienisz, zmień też liczby w `supabase-schema.sql` (sekcja `constraint ... check`) i uruchom tę zmianę ponownie w SQL Editorze.

## Automatyczne usuwanie wpisów po 30 dniach
Skrypt `supabase-schema.sql` zawiera zadanie `pg_cron`, które codziennie o 3:00 usuwa wpisy starsze niż 30 dni. Żeby zadziałało:
1. W Supabase wejdź w **Database → Extensions**, włącz rozszerzenie **pg_cron**.
2. Uruchom w SQL Editorze cały plik `supabase-schema.sql` jeszcze raz (albo tylko sekcję na dole, jeśli resztę masz już wgraną).

Dodatkowo strona sama, przy każdym wczytaniu, dociąga i kasuje przeterminowane wpisy po stronie przeglądarki — to zapasowe zabezpieczenie na wypadek, gdyby `pg_cron` nie był dostępny na Twoim planie Supabase.

## Mocniejsza ochrona (opcjonalnie, dla zaawansowanych)
W obecnej wersji captcha blokuje przycisk „wyślij" dopóki nie zostanie rozwiązana — to zatrzymuje zwykłe boty i przypadkowy spam, ale technicznie ktoś zaawansowany mógłby ją ominąć, wysyłając zapytanie bezpośrednio do Supabase. Żeby to zamknąć całkowicie, trzeba dodać weryfikację tokenu captchy po stronie serwera — w Supabase robi się to przez **Edge Function**, która sprawdza token w Cloudflare przed zapisaniem wpisu. To wymaga instalacji Supabase CLI i jest osobnym, bardziej zaawansowanym krokiem — daj znać, jeśli chcesz, żebym to też przygotował.

## Jak działa anonimowość
Baza nie zapisuje adresów IP, kont ani żadnych danych identyfikujących — jedyne co trafia do bazy to treść wpisu, opcjonalna ksywka i czas dodania. Administratorzy widzą to samo, co każdy odwiedzający stronę (plus możliwość usuwania).
