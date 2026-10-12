# Syed Global Group — Finance Tracker & Mobile App

A modern, responsive financial tracking and business reporting application built with **React**, **shadcn/ui**, **Tailwind CSS v4**, **Capacitor (Android/iOS)**, and **Supabase Cloud**.

Converted from the standalone HTML/JS mockup in `Example/` with all original business logic, October 2026 transaction records (253 entries), custom category management, printable reports, and multi-device cloud synchronization.

---

## ✨ Features

1. **Dashboard & Financial Overview**:
   - Monthly and custom date range filters.
   - Real-time stat cards: Total Income, Total Expenses, Net Balance, and Entries Recorded.
   - Interactive daily cash flow chart and top expense breakdown.
   - Filterable & searchable recent transaction records.

2. **Daily Batch Entry**:
   - Fast, streamlined daily cash and expense reconciliation.
   - Grouped income sources and expense categories with instant running totals.

3. **All Transactions Management**:
   - Full transaction table with pagination, category search, type filters, and CSV export.
   - Modal for adding and updating single income/expense entries.

4. **Category Breakdown & Management**:
   - Ranked spending and income source breakdown bars.
   - Category management to create and rename categories (renaming propagates across all past entries).

5. **Printable Business Reports**:
   - Formatted statements with company branding, tax registration (GSTIN), address, and official signatures.
   - Print-optimized CSS (`@media print`) and PDF generation.

6. **Company Details**:
   - Custom business name, contact info, and logo upload/restoration.

7. **Supabase Cloud Integration**:
   - Pre-configured for project `https://ejbiglcdrpgnmximfhjm.supabase.co`.
   - Complete database schema with RLS policies provided in [`supabase/schema.sql`](file:///home/rei/Projects/NotMugil/finance/supabase/schema.sql).
   - In-app Cloud & Sync settings for entering credentials, pushing local data, and pulling cloud updates.

8. **Capacitor Mobile App Ready**:
   - Full native mobile configuration (`capacitor.config.ts`).
   - Native Android project scaffolded under `android/`.

---

## 🚀 Getting Started

### 1. Install & Run Web App
```bash
npm install
npm run dev
```

### 2. Connect Supabase
1. Open your Supabase Dashboard at `https://ejbiglcdrpgnmximfhjm.supabase.co`.
2. Go to the **SQL Editor** and execute [`supabase/schema.sql`](file:///home/rei/Projects/NotMugil/finance/supabase/schema.sql).
3. Copy your project's **anon public key** from *Project Settings → API*.
4. In the app, open the **Cloud & Supabase** tab in the sidebar and enter your key (or set `VITE_SUPABASE_ANON_KEY` in `.env`).
5. Click **Push Local Data to Supabase** to populate all 253 initial records into your cloud database.

### 3. Run Android Mobile App
```bash
# Build web assets and sync to native Android app
npm run cap:sync

# Open Android Studio
npm run cap:open
```
