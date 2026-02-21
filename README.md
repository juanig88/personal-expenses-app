# Gastos App

A personal expense tracker that helps you see your **bills and spending against your income** so you know how much money you actually have for the month.

## Why this app

I wanted to keep track of my expenses (bills, utilities, credit, etc.) next to my salary. The goal is simple: **income minus expenses = what’s left**. No default numbers — if you don’t set your income for a month, it shows as zero and the balance goes negative, so you see the real picture. You can add bills manually or pull them from Gmail (e.g. utility and credit-card emails), mark them as paid, edit amounts, and get a monthly summary and detail view.

## Features

- **Monthly summary** — Total expenses, income, and balance per month
- **Monthly detail** — List of bills, add/edit/delete, set “Cobré este mes” (income) per month
- **Bill detail** — Edit amount, mark as paid/pending, delete
- **Gmail sync** (optional) — Ingest bills from email into the same list
- **Dark/light theme**

## Tech

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) (DB: bills, monthly_income, email_services, gmail_accounts)
- [NextAuth](https://next-auth.js.org) with Google OAuth
- TypeScript, Tailwind

## Getting started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy env vars and fill in your values (see [.env.example](.env.example)):

```bash
cp .env.example .env.local
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

- Push to GitHub, connect the repo in Vercel, deploy.
- Add all variables from `.env.example` in **Vercel → Settings → Environment Variables** (never commit `.env.local`).
- For Google OAuth, add your production URLs in Google Cloud Console (redirect URI and JS origins).

See the repo or project docs for a full deploy checklist.
