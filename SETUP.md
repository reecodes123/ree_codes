# TMT Portal — Paano Patakbuhin at I-deploy

Ito na ang final na version ng portal: PostgreSQL na (hindi na MySQL), inayos
na ang bilis ng public pages, gumagana na ang login, at may one-click na
local run.

---

## ▶ Patakbuhin locally — isang click lang

> **Double-click ang `run-tmt.bat`.** Yun lang.

Ano ang nangyayari sa likod:
- Kung unang beses sa computer na iyon, awtomatiko itong mag-i-install ng
  dependencies (ilang minuto, isang beses lang) — kailangan lang naka-install
  ang **Node.js** (https://nodejs.org, LTS) at may internet.
- Awtomatiko itong nagpapatakbo ng sariling **local database** sa loob ng
  project (folder na `.localdb/`) — hindi na kailangan ng MySQL, XAMPP,
  Neon, o kahit anong setup. Sa unang takbo, gagawin at lalagyan ito ng
  starter content (isang minuto); sa mga susunod, mabilis na.
- Pagka-ready, bubuksan nito ang browser sa http://localhost:3000/login.

**Login accounts (galing sa `.env`):**

| Role | Email | Password |
|---|---|---|
| Admin/EIC | `eic@marsu.edu.ph` | `#!matrixtoday!2026` |
| Editor | `editor@marsu.edu.ph` | `#!matrixtoday!2026` |

Para ihinto: isara / i-Ctrl+C ang "TMT Portal Development Server" na window.

**Tandaan:** ang local database na ito ay nasa computer lang na iyon — bawat
laptop ay may sariling test data. Ang totoong shared data ay nasa Neon
(para sa deployed site) — setup sa baba.

---

## 🚀 I-deploy sa Vercel (ang totoong site)

### Step 1 — Gumawa ng libreng PostgreSQL database (Neon)

1. Mag-sign up sa https://neon.tech (pwedeng Google account ng org).
2. **Create project** → pangalanan (hal. `tmt-portal`) → region na malapit
   (Singapore / `ap-southeast-1`).
3. Sa project dashboard, i-copy ang **Pooled connection string** (may
   `-pooler` sa host). Ganito ang itsura:
   ```
   postgresql://user:password@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

> **Bakit pooled?** Sa Vercel, bawat request ay pwedeng magbukas ng bagong
> database connection; ang pooled URL ang pumipigil na maubos ang connections.

*Alternatibo:* sa Vercel dashboard mismo — **Storage → Create Database →
Neon Postgres** — awtomatiko pa nitong ilalagay ang `DATABASE_URL` sa project.

### Step 2 — I-push sa GitHub at i-import sa Vercel

1. I-push ang project folder na ito sa GitHub repo ninyo.
2. Sa Vercel: **Add New → Project** → i-import ang repo.
3. Sa **Environment Variables**, ilagay lahat ng nasa `.env`, pero:
   - `DATABASE_URL` → ang pooled Neon URL (Step 1)
   - `NEXTAUTH_URL` at `NEXT_PUBLIC_SITE_URL` → ang totoong domain
     (hal. `https://tmt-portal.vercel.app`)
   - `BLOB_READ_WRITE_TOKEN` → gumawa ng Blob store sa Vercel
     (**Storage → Blob**) at i-copy ang token — dito napupunta ang mga
     uploaded na larawan.
4. **Deploy.** Awtomatiko nang gagawin ng build ang database tables
   (`vercel-build` script: prisma generate + migrate deploy + next build).

### Step 3 — I-seed ang production database (isang beses lang)

Pagkatapos ng unang deploy, lagyan ng starter accounts/content ang Neon
database. Sa sariling computer, sa project folder, sa PowerShell:

```powershell
Get-Content .env | ForEach-Object { if ($_ -match '^([A-Z_]+)="?([^"]*)"?$') { Set-Item "env:$($matches[1])" $matches[2] } }
$env:DATABASE_URL = "ANG-NEON-POOLED-URL-NINYO"
npm run db:seed
```

Tapos! Mag-login na sa `https://inyong-domain/login` gamit ang admin account.

### Step 4 — Paganahin ang "Forgot Password?" (Gmail App Password)

1. Sa Gmail ng publication (`thematrixtoday.msc@gmail.com`), i-on ang
   **2-Step Verification** (Google Account → Security).
2. Google Account → Security → 2-Step Verification → **App passwords** →
   gumawa para sa "Mail" → makakakuha ng 16-character na password.
3. Ilagay sa Vercel env vars (at sa `.env` kung gusto ring gumana locally):
   ```
   GMAIL_USER="thematrixtoday.msc@gmail.com"
   GMAIL_APP_PASSWORD="ang16characterpassword"
   ```
   **Hindi** ito ang normal na Gmail password — App Password lang.
4. Redeploy, tapos subukan ang "Forgot Password?" sa login page.

---

## Mga madalas itanong

**Paano magpalit ng email o magdagdag ng account?**
Login bilang Admin/EIC → Dashboard → Users. Makakagawa ng bagong Editor
account (kahit anong email), at mapapalitan ang email ng kahit anong account
gamit ang pencil icon sa tabi nito. Ang mga `SEED_*` sa `.env` ay panimulang
accounts lang, hindi permanente.

**Gusto kong gamitin ang Neon database kahit locally (shared data sa team)?**
Palitan lang ang `DATABASE_URL` sa `.env` ng Neon URL — kapag may totoong URL
doon, awtomatikong iyon ang gagamitin ng `run-tmt.bat` sa halip na ang local
database.

**Bakit mabilis na ang public pages ngayon?**
Naka-60-second cache (ISR) na ang public site sa halip na fresh database
queries bawat click. Ang mga edit mula sa dashboard ay agad pa ring lumalabas
— ang mga save/publish na action ay nagre-refresh mismo ng apektadong pages.

**Ano ang mangyayari sa lumang MySQL data?**
Hindi dinadala — nagsisimula sa seed data. Kung may lumang MySQL backup/dump
kayong gustong isalba, kailangan ng hiwalay na one-time import; sabihin
ninyo lang.

**Nag-error ang run-tmt.bat?**
- Tingnan kung naka-install ang Node.js (`node --version` sa terminal).
- Kung sabi ay busy ang port 3000, may ibang kopya pa ng portal na nakabukas
  — isara muna iyon (o i-restart ang computer kung hindi makita).
- Kung gusto ninyong mag-reset ng local test data, burahin lang ang
  `.localdb/` folder — gagawa ulit ito ng sariwang database sa susunod
  na takbo.
