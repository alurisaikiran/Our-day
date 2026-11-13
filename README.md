# Our Days

A private two-person tracker: **you (admin)** plan her day and see everything she shares; **she** sees today's plan, edits what actually happened, logs meals / sleep / health / study, adds her own plans and learning goals, and uploads health reports.

- Next.js 15 (App Router) · runs on Vercel
- Data: **Postgres on Neon** (Vercel's Postgres option — tables are created automatically on first visit)
- Files (health reports): **Vercel Blob**
- AI helper (Claude): **report checker** + **learning coach**
- Login: two accounts set with environment variables (no sign-up page, so nobody else can join)

## Where the data lives

| What | Where |
|---|---|
| Daily plan, her edits, sick days, meals, sleep, health notes, study logs, future plans, learning goals, "updates from her" feed | Neon Postgres database connected to your Vercel project |
| Uploaded reports (PDF / photos) | Vercel Blob store connected to your Vercel project |
| AI report summaries and coach reviews | Same database (`reports.ai_summary`, `ai_reviews`) |
| Who is logged in | A signed cookie in each browser (30 days) |

Entries she logs with **"Share with …" turned off** are saved but never shown on your admin side.

> Report files get a long random link. Anyone who has that exact link can open the file, so don't forward report links.

## Deploy to Vercel (about 15 minutes)

1. **Put the code on GitHub**
   Open a terminal in this folder:
   ```bash
   git init
   git add .
   git commit -m "Our Days"
   ```
   Create an empty **private** repo on github.com, then follow its "push an existing repository" commands.

2. **Import into Vercel** — vercel.com → *Add New… → Project* → pick the repo → *Deploy*.
   (The first deploy will show errors until steps 3–5 are done. That's expected.)

3. **Add the database** — in the project: *Storage → Create Database → Neon (Postgres)* → create → *Connect* to this project.
   This adds `DATABASE_URL` for you.

4. **Add file storage** — *Storage → Create → Blob* → create → *Connect* to this project.
   This adds `BLOB_READ_WRITE_TOKEN` for you.

5. **Add your logins** — *Settings → Environment Variables*, add:

   | Name | Example |
   |---|---|
   | `AUTH_SECRET` | any long random text, 32+ characters |
   | `ADMIN_NAME` | Sai |
   | `ADMIN_EMAIL` | your email |
   | `ADMIN_PASSWORD` | a strong password |
   | `HER_NAME` | her name |
   | `HER_EMAIL` | her email |
   | `HER_PASSWORD` | a password for her |
   | `APP_TIMEZONE` | America/New_York |

   Tip for `AUTH_SECRET`: run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

   **AI helper (optional, but this is what powers the report checker and learning coach):**

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | from console.anthropic.com → API Keys (pay-as-you-go; a report check or coach review costs a few cents) |
   | `CRON_SECRET` | any random text — lets Vercel run the weekly coach review |
   | `AI_MODEL` | leave empty (auto-picks the newest Sonnet) |

6. **Redeploy** — *Deployments → ⋯ → Redeploy*. Open the URL, sign in as admin, go to **Plan her day** and add tomorrow's schedule.

7. **Share the link with her.** On her phone she can use *Share → Add to Home Screen* (iPhone) or *Install app* (Android) so it opens like an app.

## The AI helper

**Report checker** — every report uploaded (PDF, JPG, PNG, WEBP) is read automatically in the background. On the report you get: what the report is, values outside the printed normal range, questions for the doctor, and whether anything is marked urgent. It explains — it never diagnoses. Older reports get an **Explain with AI** button; any summary can be re-run with **Check again**.

**Learning coach** — looks at the learning goals, the last 2 weeks of study logs (shared ones only), planned study blocks and sick days, then writes: how it went, what's working, the next topics for each goal, and a suggested plan for next week. Runs automatically **every Sunday** (Vercel Cron, `vercel.json`) and any time either of you taps **Ask the learning coach** (her Plans tab, your Plan page and Dashboard).

Turn it off any time by removing `ANTHROPIC_API_KEY`.

## Run on your computer (optional)

```bash
npm install
npm i -g vercel
vercel link          # pick the same project
vercel env pull .env.local
npm run dev          # http://localhost:3000
```

## How it fits together

```
app/
  login/           sign-in page
  me/              HER side: Today (edit / sick day), Log, Plans (+ learning goals), Health (+ reports)
  admin/           YOUR side: Dashboard (plan vs actual, updates, sleep, meals, health, learning), Plan her day
  actions.ts       every save / change (checks who is allowed to do it)
  api/cron/learning  weekly learning-coach job
lib/
  ai.ts            AI report checker + learning coach (prompts live here)
  auth.ts          logins + session cookie
  db.ts            database connection + table setup
  time.ts          dates and times in your time zone
middleware.ts      keeps her out of /admin and you out of /me
```

## Ideas for later

- Let the coach add its suggested study blocks straight into your plan with one tap
- Reminders (e.g. "Dinner not logged yet", "Appointment in 1 hour") using Vercel Cron + push notifications
- Period / cycle tracking, exercise, water goal
- Letting you comment or send a heart on her entries
