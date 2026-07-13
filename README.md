# TaxiLab 🚕

> Self-hosted tax planning and paycheck analysis for power users.

TaxiLab is a self-hosted web application for tracking paychecks, estimating Federal and California tax withholding, projecting year-end tax liability, and modeling "what-if" withholding scenarios.

The project is designed for accuracy rather than simplicity. Wherever possible, calculations follow official IRS and California tax publications instead of simplified tax bracket approximations.

---

## Features

### 💰 Paycheck Tracking

- Track paychecks for multiple earners
- YTD and projected totals
- Federal and California withholding
- OASDI, Medicare, and CA SDI tracking
- Pre-tax deductions (HSA, 401(k), etc.)
- Employer contributions
- Take-home pay
- Household view combining all earners
- Generate an entire year's paycheck schedule from a template

---

### 📋 Withholding Calculators

#### Federal (IRS Pub. 15-T)

- Exact Percentage Method withholding
- Supports 2020+ W-4
- Multiple Jobs checkbox
- Step 3, 4a, 4b, and 4c adjustments
- All supported pay frequencies

#### California (DE-44)

- Exact Method B calculations
- Filing status support
- Allowances
- Estimated deductions
- Additional withholding

Compare expected withholding against actual paychecks to identify drift throughout the year.

---

### 📈 Investment Income Tracking

Track projected investment income by brokerage account:

- Short-term capital gains
- Long-term capital gains
- Qualified dividends
- Ordinary dividends
- Interest income

Each category supports:

- Manual annual estimate
- YTD + automatic year-end projection

---

### 📊 Tax Projection

Project your year-end household tax position using:

- Combined wages
- Investment income
- Other income
- Federal deductions
- California deductions
- Federal & California withholding

Calculates:

- Federal tax liability
- California tax liability
- Long-term capital gains tax
- Net Investment Income Tax (NIIT)
- Additional Medicare Tax
- California Mental Health Services Tax
- Estimated refund or balance due

---

### 🔄 What-If Modeling

Experiment with W-4 and DE-4 changes without modifying historical data.

Example questions:

- What if I increase my additional withholding?
- What if I switch to Married Filing Jointly?
- What if I change my deductions starting next paycheck?

TaxiLab recalculates all remaining projected paychecks and instantly updates the projected refund.

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite
- Node.js

Designed to run on a small always-on home server and install as a Progressive Web App (PWA) on iOS.

---

## Design Goals

- Single-household focused
- Self-hosted
- Offline-friendly
- Fast
- No cloud database
- No subscriptions
- No ads
- No telemetry
- Calculation engines implemented as pure, unit-testable functions

---

## Tax Accuracy

TaxiLab aims to closely match official tax calculations by using:

- IRS Pub. 15-T
- IRS income tax brackets
- IRS long-term capital gains worksheets
- California EDD DE-44
- California Form 540 tax tables

Tax data is versioned by tax year, allowing historical calculations and easy updates when new tax publications are released.

---

## Project Structure

```text
app/                Next.js pages
components/         UI components
lib/                Tax engines and business logic
prisma/             Database schema and migrations
tax-data/           Versioned IRS & CA tax tables
data/               SQLite database (gitignored)
tests/              Unit tests
scripts/            Utility scripts
```

## Getting started (development)

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed               # creates default earners, a 2026 TaxProfile, one brokerage account
npm run dev                 # http://localhost:3000
```

There is no login -- the app has no auth layer. Only run it on a trusted home network / behind your own access control if that matters to you.

Run the tax engine test suite (Layer 2 vectors are checked against real IRS Pub 15-T / CA DE-44 worked examples):

```bash
npm test
```

## Deploying to a home server

1. **Build:** `npm ci && npx prisma migrate deploy && npm run build`
2. **Environment:** copy `.env.example` to `.env` on the server.
3. **Process manager:** `pm2 start ecosystem.config.js` (see that file for the process config; `pm2 save && pm2 startup` to survive reboots). A `systemd` unit calling `next start` works equally well if you prefer not to use pm2.
4. **Reverse proxy / HTTPS:** point Caddy or nginx at `localhost:3000`. See `Caddyfile.example` for a minimal Caddy config (automatic Let's Encrypt HTTPS).
5. **Backups:** `scripts/backup.sh` dumps `data/tax.db` to iCloud Drive and prunes backups older than 30 days. Add it to cron, e.g.:
   ```
   0 3 * * * /path/to/taxilab/scripts/backup.sh >> /path/to/taxilab/logs/backup.log 2>&1
   ```
   It can also be triggered manually from Settings → Backup in the app.
6. **PWA on iOS:** open the deployed HTTPS URL in Safari, then Share → Add to Home Screen.

## Tax data updates for future years

`tax-data/2026/*.json` contains the current dataset, sourced directly from IRS Publication 15-T (2026), IRS Rev. Proc. 2025-32, IRS Publication 15 (2026), and the CA EDD "California Withholding Schedules for 2026" (Method B) -- see the `_source` field in each file. CA 540 liability bracket/standard-deduction/exemption-credit figures are derived from the DE-44 withholding tables as the closest verified proxy (flagged `_provisional` in `ca-540-brackets.json`); verify against the official FTB Form 540 booklet before relying on them for real filing decisions.

To add a new tax year, create `tax-data/YYYY/` with the same six files, update `scripts/seed-2026.ts` (or add a year-specific seed script), and re-run the Layer 2 test suite against that year's worked examples before switching the app's default tax year.

## Disclaimer

TaxiLab is a tax planning and forecasting tool. It does not prepare or file tax returns and should not be considered legal, financial, or tax advice. Always verify important tax decisions against official IRS and California guidance or consult a qualified tax professional.
