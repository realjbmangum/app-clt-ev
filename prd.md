# PRD: CLT EV — City of Charlotte EV Charging Analytics Dashboard

> [!info] Client: City of Charlotte | Model: T&M | Timeline: Prototype ASAP

---

## Overview

The City of Charlotte manages **208 ChargePoint EV charging stations** across **46 locations** (plus 2 in Huntersville). These stations span three org units: City of Charlotte (178), Charlotte Douglas International Airport (20), and City of Charlotte-Water (10).

Currently, city staff must log into ChargePoint's portal to view station data — a tool designed for station operators, not municipal decision-makers. The city needs a **purpose-built analytics dashboard** that surfaces utilization, costs, trends, and operational health across their entire charging network, tailored to the roles that actually need the data.

**Data source:** ChargePoint API (authenticated access already established).

---

## Goals

1. **Single-pane visibility** — All 208 stations, their real-time status, and historical performance in one dashboard
2. **Cost intelligence** — Track electricity costs per station, per location, per org unit, and over time
3. **Utilization analytics** — Identify underused stations, peak hours, and capacity planning needs
4. **Operational health** — Surface UNREACHABLE (29 currently) and FAULTED (2 currently) stations for maintenance
5. **Role-based access** — Different views for operations, finance, and leadership
6. **Trend detection** — Month-over-month and seasonal patterns in usage and cost

---

## Non-Goals

- **Public-facing app** — This is an internal tool for city staff only
- **Payment processing** — ChargePoint handles billing to drivers
- **Station control** — No remote start/stop/reboot in v1 (read-only dashboard)
- **Mobile app** — Web-first; mobile-responsive but not a native app
- **Real-time alerting** — v1 focuses on dashboards; alerts/notifications are a future add-on

---

## User Roles

### 1. Operations Manager (Fleet/Facilities)
**Needs:** Day-to-day station health monitoring
- See which stations are AVAILABLE, OCCUPIED, UNREACHABLE, or FAULTED
- View station uptime/downtime history
- Filter by location, org unit, public vs. private
- Map view of all stations with status indicators
- Drill into individual station details (connector type, warranty status, usage history)

### 2. Finance / Budget Analyst
**Needs:** Cost tracking, forecasting, and budget reporting
- Total electricity spend by month, quarter, year
- Cost per kWh trends over time
- Cost breakdowns by org unit (City, Airport, Water)
- Cost per location for facility budgeting
- Exportable reports (CSV/PDF) for budget submissions
- Comparison against utility rate changes

### 3. City Leadership / Council
**Needs:** High-level KPIs and strategic insights
- Executive summary dashboard (one-screen overview)
- Total sessions served, energy delivered, estimated CO2 offset
- Network growth over time (stations added)
- Public vs. private utilization comparison
- Benchmark data for expansion planning

### 4. System Administrator
**Needs:** User management and system configuration
- Add/remove users, assign roles
- Configure data sync intervals
- View API health and sync logs
- Manage org unit groupings

---

## User Stories

### Story 1: Station Map and Status Overview
**As an** Operations Manager
**I want to** see all 208 stations on an interactive map with real-time status colors
**So that** I can quickly identify stations that need attention

**Acceptance Criteria:**
- [ ] Map displays all stations with color-coded markers (green=AVAILABLE, blue=OCCUPIED, red=FAULTED, gray=UNREACHABLE)
- [ ] Clicking a marker shows station name, address, connector type, power type, and current status
- [ ] Filter panel allows filtering by: org unit, public/private, status, power type
- [ ] Station count summary bar shows totals by status
- [ ] Data refreshes from ChargePoint API on a configurable interval (default: 15 min)

### Story 2: Station List and Detail View
**As an** Operations Manager
**I want to** search, sort, and drill into individual stations
**So that** I can investigate issues and review station history

**Acceptance Criteria:**
- [ ] Searchable, sortable table of all stations with key columns (name, address, status, org, power type, warranty)
- [ ] Clicking a row opens a detail panel with full station info
- [ ] Detail panel shows session history for the station (last 30 days)
- [ ] Detail panel shows uptime percentage and last status change
- [ ] Export table to CSV

### Story 3: Utilization Dashboard
**As an** Operations Manager
**I want to** see utilization metrics across the network
**So that** I can identify underused and overloaded stations

**Acceptance Criteria:**
- [ ] Bar chart: sessions per station (top 20 / bottom 20)
- [ ] Heatmap: usage by hour-of-day and day-of-week
- [ ] Line chart: total sessions over time (daily/weekly/monthly)
- [ ] Average session duration trend
- [ ] Filter by org unit, location, date range

### Story 4: Cost and Energy Dashboard
**As a** Finance Analyst
**I want to** track electricity costs and energy consumption
**So that** I can prepare budget reports and identify cost trends

**Acceptance Criteria:**
- [ ] Line chart: total energy consumed (kWh) over time
- [ ] Line chart: estimated electricity cost over time
- [ ] Breakdown table: cost by org unit and by location
- [ ] Cost-per-session and cost-per-kWh metrics
- [ ] Date range picker (month, quarter, year, custom)
- [ ] Export to CSV for budget reporting

### Story 5: Executive Summary
**As** City Leadership
**I want to** see a single-screen overview of the EV charging program
**So that** I can assess program health without digging into details

**Acceptance Criteria:**
- [ ] KPI cards: total stations, total sessions (period), total energy (kWh), estimated CO2 offset, network uptime %, total estimated cost
- [ ] Trend sparklines on each KPI card (vs. previous period)
- [ ] Pie chart: station distribution by org unit
- [ ] Pie chart: public vs. private utilization split
- [ ] Month-over-month comparison table

### Story 6: Authentication and Role-Based Access
**As a** System Admin
**I want to** manage users with different permission levels
**So that** each team sees only what they need

**Acceptance Criteria:**
- [ ] Login via email/password (Cloudflare Access or simple auth)
- [ ] Four roles: Admin, Operations, Finance, Leadership
- [ ] Admin can create/edit/deactivate users and assign roles
- [ ] Each role sees only their relevant dashboard tabs
- [ ] Session timeout after 30 minutes of inactivity

### Story 7: Data Sync and API Integration
**As a** System Admin
**I want** the dashboard to automatically pull data from ChargePoint
**So that** the data is always current without manual intervention

**Acceptance Criteria:**
- [ ] Cloudflare Worker runs on cron schedule to pull station status (every 15 min)
- [ ] Cloudflare Worker pulls session/usage data (every 1 hour)
- [ ] Station metadata (from CSV) is seeded into D1 and kept in sync
- [ ] API errors are logged and visible in an admin health panel
- [ ] Historical data is stored in D1 for trend analysis
- [ ] Raw API responses are archived in R2 for audit/debugging

---

## Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React SPA (Vite) on Cloudflare Pages | Heavy interactivity (maps, charts, filters, drill-downs) — SPA is the right fit over Astro for a dashboard this interactive |
| **Charts** | Recharts or Chart.js | Lightweight, React-native charting |
| **Maps** | Mapbox GL JS | Already in Brian's stack, great for marker clustering at 208 points |
| **API Layer** | Cloudflare Workers (Hono) | API routes for frontend + cron jobs for ChargePoint sync |
| **Database** | Cloudflare D1 | Station metadata, session history, user accounts, cost data |
| **Object Storage** | Cloudflare R2 | Archive raw API responses, exportable reports |
| **Auth** | Cloudflare Access or custom JWT | Role-based access, simple to implement |
| **ChargePoint API** | REST (authenticated) | Data source for station status, sessions, energy usage |

### D1 Schema (Core Tables)

```
stations         — 208 rows, synced from ChargePoint + CSV seed
sessions         — historical charging session records
energy_readings  — periodic kWh/cost snapshots per station
users            — dashboard users with role assignments
sync_logs        — API sync health tracking
```

### Worker Cron Jobs

```
*/15 * * * *   — Station status sync (real-time status)
0 * * * *      — Session data sync (usage history)
0 6 * * *      — Daily energy/cost aggregation
```

### Project Structure

```
app-clt-ev/
  dashboard/           — React SPA (Vite)
    src/
      components/      — Map, Charts, Tables, KPI cards
      pages/           — MapView, Utilization, Cost, Executive, Admin
      lib/             — API client, auth hooks, formatters
  worker/              — Cloudflare Worker (Hono)
    src/
      routes/          — API endpoints for dashboard
      sync/            — ChargePoint API sync jobs
      db/              — D1 schema, migrations, queries
  data/
    clt-stations.csv   — Station seed data
    schema.sql         — D1 schema
  wrangler.toml
  prd.md
```

---

## Data Insights from CSV (Prototype Seed)

| Metric | Value |
|--------|-------|
| Total stations | 208 |
| Unique locations | 46 addresses |
| Org units | City of Charlotte (178), Airport (20), Water (10) |
| Public stations | 77 (37%) |
| Private/fleet stations | 131 (63%) |
| Currently AVAILABLE | 157 (75%) |
| Currently UNREACHABLE | 29 (14%) — needs investigation |
| Currently OCCUPIED | 20 (10%) |
| Currently FAULTED | 2 (1%) — needs maintenance |
| Power types | AC Level 2 (196), DC Fast (2), Unknown (10) |
| Warranty types | Standard (106), ChargePoint Assure (102) |

---

## Build Order (Recommended)

> [!warning] Prototype-first — get data flowing, then build views on top.

| Phase | Stories | What Gets Built | Est. Sessions |
|-------|---------|-----------------|---------------|
| **1. Data Foundation** | Story 7 | D1 schema, CSV seed, ChargePoint API sync worker, R2 archiving | 2-3 |
| **2. Operations View** | Stories 1, 2 | Map view, station list/detail, status monitoring | 2-3 |
| **3. Analytics** | Stories 3, 4 | Utilization charts, cost/energy dashboard, exports | 2-3 |
| **4. Executive + Auth** | Stories 5, 6 | Executive summary, user roles, login | 2 |

---

## Resolved Questions

1. **ChargePoint API scope** — Full access confirmed. Can pull real-time station status, historical session data, and energy/cost data.
2. **Electricity cost source** — ChargePoint provides cost data via API. Phase 2 will integrate Duke Energy rate schedule for more accurate cost modeling.
3. **Historical data** — ChargePoint API does not appear to have a documented retention limit. The API returns sessions by date range with a max of 100 per call (paginated). We should begin syncing immediately to build our own historical dataset in D1.
4. **User count** — Under 50 users. Cloudflare Access (free tier) confirmed as auth approach.
5. **Branding** — On-brand with City of Charlotte identity guide (v3.1). See details below.

---

## Brand Specifications

> Source: `charlotte-identity-guide-v-3-1.pdf` (City of Charlotte Visual Style Guide, Fall 2022)

### Logo
- **Primary:** Vertical stacked crown logo (crown + "CITY OF CHARLOTTE")
- **Secondary:** Horizontal single-line version for nav bars / tight spaces
- **Crown + URL:** Compact version with charlottenc.gov
- Use departmental variant if needed: crown + city name + department label bar
- Clear space: minimum equal to cap height of "C" in Charlotte

### Primary Color Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Dark Charlotte Green** | `#24824A` | 36/130/74 | Primary color, graphic elements |
| **Light Charlotte Green** | `#71BF44` | 113/191/68 | Highlights, accents |
| **Paper White** | `#FFFFFF` | 255/255/255 | Backgrounds |
| **Text Black** | `#141E28` | 0/0/0 | Body text |

### Secondary Colors (for charts/data viz)

| Name | Hex | Usage in Dashboard |
|------|-----|--------------------|
| **Blue** | `#2F70B8` | Secondary charts, links |
| **Med Blue** | `#02508E` | Chart contrast |
| **Yellow** | `#FADD4A` | Warning states, highlights |
| **Orange** | `#EA983E` | Alert indicators |
| **Red** | `#DE0505` | FAULTED status, errors |
| **Dark Teal** | `#0A7D8C` | Tertiary charts |
| **Light Teal** | `#00A79C` | Tertiary charts |
| **Navy** | `#0C1C35` | Dark mode potential, sidebar |

### Station Status Color Mapping

| Status | Color | Hex |
|--------|-------|-----|
| AVAILABLE | Light Charlotte Green | `#71BF44` |
| OCCUPIED | Blue | `#2F70B8` |
| UNREACHABLE | Yellow/Orange | `#EA983E` |
| FAULTED | Red | `#DE0505` |

### Typography

| Role | Font | Fallback |
|------|------|----------|
| **Primary (headings, UI)** | Proxima Nova (Adobe Typekit) | Century Gothic |
| **Secondary (body, labels)** | Mrs Eaves XL Serif Nar OT | Cambria |
| **System/data tables** | Century Gothic | system sans-serif |

> For a web dashboard, we'll use **Proxima Nova** via Adobe Fonts for headings/UI and **Century Gothic** (system font) as the data/body fallback to avoid font licensing costs. If the city has an Adobe Fonts subscription, we can use both.

---

*PRD created: March 20, 2026*
*Client: City of Charlotte*
*Builder: Lighthouse 27 LLC*
