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

## Disclaimer

TaxiLab is a tax planning and forecasting tool. It does not prepare or file tax returns and should not be considered legal, financial, or tax advice. Always verify important tax decisions against official IRS and California guidance or consult a qualified tax professional.
