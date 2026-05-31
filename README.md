# Kitchen Recipe OS — Database Setup Guide

## Stack
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Frontend**: Next.js 14 App Router + React
- **Notifications**: n8n webhook → Telegram (@Marketing_Bahrain_Bot)

---

## File Execution Order

Run these SQL files **in order** against your Supabase project:

```
01_schema.sql   → Tables, enums, indexes, triggers, functions
02_rls.sql      → Row Level Security policies (all 14 tables)
03_seed.sql     → Venues (8), sections (47+), ingredient master starter set
```

**How to run**: Supabase Dashboard → SQL Editor → paste and run each file.

---

## First-Run Steps

### 1. Create Storage Buckets
Uncomment and run the storage bucket SQL at the bottom of `01_schema.sql`, or create manually in Supabase Dashboard → Storage:

| Bucket | Public | Max file size | Allowed types |
|---|---|---|---|
| `recipe-images` | No | 10 MB | jpeg, png, webp |
| `recipe-videos` | No | 200 MB | mp4, quicktime, webm |
| `import-files` | No | 50 MB | xlsx, xls |

### 2. Set Owner Role
After Paul signs up via Supabase Auth for the first time, run:
```sql
update public.profiles
set role = 'owner'
where email = 'paul@yourdomain.com';
```
The auth trigger creates the profile automatically. You just need to promote the role.

### 3. Set Auth Redirect URLs
In Supabase Dashboard → Auth → URL Configuration:
- Site URL: `https://your-app-domain.com`
- Redirect URLs: `https://your-app-domain.com/auth/callback`

---

## Venue Reference

| ID suffix | Venue | Country | VAT | Type |
|---|---|---|---|---|
| ...0001 | Brewed Cafe | 🇧🇭 BH | 10% | physical |
| ...0002 | Wildflour | 🇧🇭 BH | 10% | physical |
| ...0003 | Sage & Sirloin | 🇧🇭 BH | 10% | physical |
| ...0004 | Royal Chippy | 🇧🇭 BH | 10% | physical |
| ...0005 | Sage & Sirloin Lounge | 🇸🇦 SA | 15% | physical |
| ...0006 | TFJ (incl. The Box) | 🇸🇦 SA | 15% | physical |
| ...0007 | V Seven | 🇸🇦 SA | 15% | physical |
| ...0008 | Pastry Hub | — | 0% | pastry_hub |

**Sage & Sirloin BH and Sage & Sirloin Lounge SA** share `brand_group = 'sage_sirloin'` for cross-venue reporting but are fully independent recipe databases.

**TFJ The Box** dishes live in the `The Box Exclusives` section within TFJ venue (ID ...0066). No separate venue record.

---

## Key Design Decisions

### Permission Hierarchy
Permissions resolve in this order (most specific wins):
1. `recipe_id` match → recipe-level permission
2. `section_id` match → section-level permission
3. `venue_id` match → venue-level permission
4. All nulls → company-wide permission
5. Owner role → bypasses all (no permissions row needed)

### VAT Calculation
`misc_cost_amount = total_ingredient_cost × misc_cost_pct` (kitchen misc, usually 4%)
`total_cost = total_ingredient_cost + misc_cost_amount`

The venue `vat_rate` is stored separately and applied at the selling price display level, not in food cost calculation. This matches the existing Excel behaviour.

### Recipe Versioning
Every save that changes `title`, `description`, `portion_size`, or `selling_price` auto-increments `version_number`. A full snapshot of ingredients + steps is written to `recipe_versions` via your application layer (not a DB trigger — too much data for a trigger).

### Ingredient Master & Duplicate Detection
The `pg_trgm` extension enables fuzzy matching. To find potential duplicates:
```sql
select a.canonical_name, b.canonical_name,
       similarity(a.canonical_name, b.canonical_name) as sim
from ingredient_master a, ingredient_master b
where a.id <> b.id
and similarity(a.canonical_name, b.canonical_name) > 0.5
order by sim desc;
```

---

## n8n Telegram Notification Setup

1. In n8n, create a webhook node listening for `POST /recipe-notification`
2. Add a Telegram node sending to `@Marketing_Bahrain_Bot` or owner's chat_id
3. In your Next.js app, after writing to `audit_logs`, insert a row to `notifications` with `channel = 'telegram'` and `telegram_sent = false`
4. n8n polls the notifications table (or Supabase triggers a webhook) for unsent Telegram rows
5. After delivery, n8n sets `telegram_sent = true`

Alternatively, use a Supabase Database Webhook (Dashboard → Database → Webhooks) on `INSERT` to `notifications` where `channel = 'telegram'`.

---

## Excel Import Cell Mapping Reference

| Field | Cell | Notes |
|---|---|---|
| Outlet/Venue | B1 | Matched to venue name |
| Recipe name | B2 | |
| Description | B3 | |
| Portion size | B5 | |
| Recipe size | B6 | |
| Ingredient qty | A10:A35 | |
| Unit of measure | B10:B35 | |
| Ingredient + prep | C10:C35 | Split at comma → name + prep_note |
| Total weight | A36 | |
| Ingredient cost | F36 | |
| Misc/VAT cost | F37 | |
| Total cost | F38 | |
| Selling price | E45 | |
| Cost percentage | E46 | |
| Method steps | A51:A63 | One line = one step |

---

## Phase Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth, venues, sections, recipes, media, permissions, kitchen view, print/share | Build now |
| 2 | Excel import parser, review screen, audit logs, notifications (in-app + Telegram), recipe versions | Build now (parallel) |
| 3 | Supplier price lists, ingredient matching, auto-costing, cost dashboard | After Phase 1 live |
| 4 | Offline kitchen mode, AI recipe search, training tracking, inventory | Future |
