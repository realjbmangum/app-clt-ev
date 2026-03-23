# CLT EV Charging Analytics Platform

## Technical Architecture & Security Overview

---

**Prepared for:** City of Charlotte, Office of the CTO

**Prepared by:** Lighthouse 27 LLC

**Date:** March 2026

**Version:** 1.0

**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Data Architecture](#4-data-architecture)
5. [Security Architecture](#5-security-architecture)
6. [Infrastructure & Hosting](#6-infrastructure--hosting)
7. [API Architecture](#7-api-architecture)
8. [Data Sync Architecture](#8-data-sync-architecture)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Development & Deployment](#10-development--deployment)
11. [Professional Team](#11-professional-team)
12. [Roadmap](#12-roadmap)
13. [Appendix A: API Endpoint Reference](#appendix-a-api-endpoint-reference)
14. [Appendix B: Database Schema](#appendix-b-database-schema)

---

## 1. Executive Summary

The CLT EV Charging Analytics Platform is a purpose-built, municipal-grade analytics dashboard designed for the City of Charlotte's EV charging infrastructure. The platform provides unified visibility into the city's 208 ChargePoint charging stations across 46 locations, serving three organizational units: City of Charlotte (178 stations), Charlotte Douglas International Airport (20 stations), and City of Charlotte-Water (10 stations). Rather than relying on ChargePoint's operator-focused portal, the platform delivers role-specific views for operations managers, finance analysts, and city leadership — each tailored to the decisions those roles actually make.

The system is built on Cloudflare's enterprise cloud infrastructure, leveraging edge computing to deliver sub-100ms response times globally while maintaining strict data residency within the United States. The architecture follows a serverless model: a React single-page application served via Cloudflare Pages communicates with a Hono-based API running on Cloudflare Workers, backed by Cloudflare D1 (distributed SQLite) for structured data and Cloudflare R2 (S3-compatible object storage) for raw API response archival. Automated cron jobs synchronize station status, charging session data, and energy aggregations from ChargePoint's SOAP/XML API v5.0 on configurable intervals.

This document provides a comprehensive technical overview of the platform's architecture, security posture, infrastructure, and deployment model. It is intended to give the City of Charlotte's CTO and IT team full confidence in the system's design, security controls, and operational readiness for municipal use.

---

## 2. Architecture Overview

### High-Level System Diagram

```
                          CITY OF CHARLOTTE NETWORK
                     ┌─────────────────────────────────┐
                     │   City Staff Browsers            │
                     │   (Operations, Finance,          │
                     │    Leadership, Admin)             │
                     └──────────────┬──────────────────┘
                                    │ HTTPS
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE GLOBAL NETWORK                     │
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐ │
│  │  Cloudflare      │    │  Cloudflare Workers (Hono API)      │ │
│  │  Pages (CDN)     │    │                                      │ │
│  │                  │    │  ┌────────────┐  ┌────────────────┐ │ │
│  │  React SPA       │───▶│  │ REST API   │  │ Cron Jobs      │ │ │
│  │  (Dashboard)     │    │  │ Routes     │  │                │ │ │
│  │                  │    │  │            │  │ */30 * * * *   │ │ │
│  │  - Map View      │    │  │ /stations  │  │ Station Status │ │ │
│  │  - Analytics     │    │  │ /sessions  │  │                │ │ │
│  │  - Cost Reports  │    │  │ /stats     │  │ 0 */2 * * *   │ │ │
│  │  - Admin Panel   │    │  │ /auth      │  │ Session Sync   │ │ │
│  │                  │    │  │ /admin     │  │                │ │ │
│  │                  │    │  │ /maint.    │  │ 0 6 * * *     │ │ │
│  └─────────────────┘    │  └─────┬──────┘  │ Energy Agg.   │ │ │
│                          │        │         └───────┬────────┘ │ │
│                          └────────┼─────────────────┼──────────┘ │
│                                   │                 │            │
│  ┌────────────────────────────────┼─────────────────┼──────────┐ │
│  │              DATA LAYER        │                 │          │ │
│  │                                ▼                 │          │ │
│  │  ┌─────────────────┐   ┌─────────────────┐      │          │ │
│  │  │  Cloudflare D1  │   │  Cloudflare R2  │      │          │ │
│  │  │  (SQLite)       │   │  (Object Store) │      │          │ │
│  │  │                 │   │                 │      │          │ │
│  │  │  - stations     │   │  Raw SOAP/XML   │      │          │ │
│  │  │  - sessions     │   │  Responses       │      │          │ │
│  │  │  - energy_read. │   │  (Audit Trail)  │      │          │ │
│  │  │  - users        │   │                 │      │          │ │
│  │  │  - sync_logs    │   └─────────────────┘      │          │ │
│  │  │  - status_hist. │                             │          │ │
│  │  │  - maint._logs  │                             │          │ │
│  │  └─────────────────┘                             │          │ │
│  └──────────────────────────────────────────────────┘          │ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + WS-Security
                                    ▼
                     ┌─────────────────────────────────┐
                     │  ChargePoint API v5.0            │
                     │  (SOAP/XML Web Services)         │
                     │                                  │
                     │  - getStationStatus              │
                     │  - getChargingSessionData        │
                     │  - getStations                   │
                     │  - getTransactionData            │
                     └─────────────────────────────────┘
```

### Data Flow Summary

1. **Inbound (ChargePoint to Platform):** Cloudflare Worker cron jobs execute on schedule, authenticate to ChargePoint's SOAP API using WS-Security credentials, retrieve station status and session data, normalize the XML responses, persist structured data to D1, and archive raw XML responses to R2.

2. **Outbound (Platform to Dashboard):** The React SPA issues authenticated REST API calls to the Worker. The Worker queries D1, formats the response as JSON, and returns it to the frontend. All communication occurs over HTTPS with JWT-based authentication.

3. **Edge Execution:** Both the frontend (via Pages CDN) and backend (via Workers) execute at Cloudflare's edge locations nearest to the requesting user, minimizing latency and eliminating the need for centralized origin servers.

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose | License |
|-------|-----------|---------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | Component-based UI with interactive maps, charts, and real-time data display | MIT |
| **Build Tool** | Vite | 6.0.0 | Fast development server and optimized production builds with tree-shaking | MIT |
| **Language** | TypeScript | 5.6.3 | Type-safe development across frontend and backend; compile-time error detection | Apache 2.0 |
| **CSS Framework** | Tailwind CSS | 3.4.15 | Utility-first styling with City of Charlotte brand token configuration | MIT |
| **Charts** | Recharts | 2.13.3 | React-native charting library for utilization, energy, and cost analytics | MIT |
| **Maps** | Mapbox GL JS | 3.20.0 | Interactive WebGL map rendering with marker clustering for 208 stations | Mapbox ToS |
| **Icons** | Lucide React | 0.460.0 | Consistent, accessible SVG icon set | ISC |
| **Routing** | React Router | 6.28.0 | Client-side routing for SPA navigation between dashboard views | MIT |
| **API Framework** | Hono | Latest | Lightweight, edge-native web framework for Cloudflare Workers | MIT |
| **Serverless Compute** | Cloudflare Workers | Latest | Edge-executed serverless functions; API routes and cron job execution | Cloudflare ToS |
| **Database** | Cloudflare D1 (SQLite) | Latest | Distributed SQLite database; structured storage for stations, sessions, users | Cloudflare ToS |
| **Object Storage** | Cloudflare R2 | Latest | S3-compatible object storage; raw API response archival for audit trail | Cloudflare ToS |
| **External API** | ChargePoint API | 5.0 | SOAP/XML web services for station status, charging sessions, and metadata | ChargePoint ToS |

All frontend dependencies are open-source under permissive licenses (MIT, Apache 2.0, ISC). Infrastructure services operate under Cloudflare's enterprise terms of service with SLA guarantees.

---

## 4. Data Architecture

### 4.1 Database Schema

The platform uses seven tables in Cloudflare D1, organized around three domains: asset management, usage analytics, and system operations.

#### Asset Management

| Table | Purpose | Key Fields | Record Volume |
|-------|---------|------------|---------------|
| `stations` | Master record for all 208 charging stations. Stores hardware identifiers, geolocation, organizational ownership, connector specifications, warranty status, and real-time operational status. | `charger_id`, `station_lat/lng`, `org_name`, `station_status`, `power_type`, `is_public` | 208 rows (relatively static) |
| `station_status_history` | Tracks every status transition for each station. Enables uptime/downtime analysis, mean-time-to-repair calculations, and reliability trending. | `station_charger_id`, `old_status`, `new_status`, `changed_at` | Growing (append-only) |
| `maintenance_logs` | Records maintenance issues, assignments, and resolution tracking. Supports operational workflows for faulted and unreachable stations. | `station_charger_id`, `issue_type`, `status`, `assigned_to`, `resolved_at` | Growing (append-only) |

#### Usage Analytics

| Table | Purpose | Key Fields | Record Volume |
|-------|---------|------------|---------------|
| `sessions` | Individual charging session records synchronized from ChargePoint. Each record captures a single vehicle charging event with energy delivered and estimated cost. | `session_id` (unique), `station_charger_id`, `start_time`, `end_time`, `energy_kwh`, `cost_usd` | Growing (append-only) |
| `energy_readings` | Daily aggregated energy and cost snapshots per station. Pre-computed from session data for efficient dashboard queries and trend analysis. | `station_charger_id`, `reading_date`, `total_kwh`, `total_cost`, `session_count` | Growing (1 per station per day) |

#### System Operations

| Table | Purpose | Key Fields | Record Volume |
|-------|---------|------------|---------------|
| `users` | Dashboard user accounts with role-based access control. Supports four roles with distinct permission levels. | `email` (unique), `role`, `password_hash`, `is_active` | <50 rows |
| `sync_logs` | Audit trail for all data synchronization operations. Records success/failure, record counts, and error messages for each sync cycle. | `sync_type`, `status`, `records_processed`, `error_message` | Growing (append-only) |

### 4.2 Data Flow Pipeline

```
ChargePoint SOAP API v5.0
         │
         │  1. Cron-triggered SOAP requests
         │     (WS-Security authentication)
         ▼
┌─────────────────────┐
│  Cloudflare Worker   │
│  (Sync Pipeline)     │
│                      │
│  ┌────────────────┐  │     ┌─────────────┐
│  │ XML Parser     │──┼────▶│ Cloudflare   │
│  │ & Normalizer   │  │     │ R2 Archive   │
│  └───────┬────────┘  │     │ (Raw XML)    │
│          │           │     └─────────────┘
│          ▼           │
│  ┌────────────────┐  │
│  │ Data Transform │  │
│  │ & Validation   │  │
│  └───────┬────────┘  │
│          │           │
│          ▼           │
│  ┌────────────────┐  │
│  │ D1 Upsert      │  │
│  │ (Idempotent)   │  │
│  └────────────────┘  │
└─────────────────────┘
         │
         │  2. REST API queries
         │     (JWT authentication)
         ▼
┌─────────────────────┐
│  React Dashboard     │
│  (Data Visualization)│
└─────────────────────┘
```

### 4.3 Data Retention Strategy

| Data Type | Retention Policy | Storage Location |
|-----------|-----------------|-----------------|
| Station metadata | Indefinite; updated on each sync cycle | D1 `stations` table |
| Charging sessions | Indefinite; historical analysis required | D1 `sessions` table |
| Energy aggregations | Indefinite; trend analysis required | D1 `energy_readings` table |
| Status change history | Indefinite; uptime reporting required | D1 `station_status_history` table |
| Sync operation logs | 90-day rolling window (recommended) | D1 `sync_logs` table |
| Raw API responses | 12-month archive; audit and debugging | R2 `clt-ev-archive` bucket |

### 4.4 Backup and Recovery

- **D1 Database:** Cloudflare D1 provides automatic point-in-time recovery with 30-day retention. Database state can be restored to any point within the retention window.
- **R2 Raw Archives:** All raw ChargePoint SOAP/XML responses are archived to R2 with date-partitioned keys (`chargepoint/{date}/{action}_{timestamp}.xml`). This provides a complete audit trail and enables data reconstruction from source if needed.
- **Schema Versioning:** The database schema is version-controlled in `data/schema.sql` and stored alongside application code in the Git repository.

---

## 5. Security Architecture

### 5.1 Current Security Measures

#### Transport Security

- **HTTPS Everywhere:** All communication between clients and the platform is encrypted via TLS 1.2+ with Cloudflare's managed SSL certificates. There is no unencrypted HTTP endpoint.
- **Cloudflare SSL/TLS:** Certificates are automatically provisioned and renewed by Cloudflare. The platform benefits from Cloudflare's edge termination, which provides modern cipher suites and protocol negotiation.

#### Authentication and Authorization

- **JWT Authentication:** User sessions are managed via JSON Web Tokens (JWT) signed with HMAC-SHA256 using the Web Crypto API. Tokens carry the user's ID, email, role, and expiration timestamp.
- **24-Hour Token Expiry:** JWT tokens expire after 24 hours, requiring re-authentication. This limits the window of exposure for any compromised token.
- **Role-Based Access Control (RBAC):** The platform enforces four distinct roles, each with tailored dashboard access:

| Role | Access Level | Dashboard Views |
|------|-------------|-----------------|
| `admin` | Full system access; user management, sync configuration, all data | All views + Admin panel |
| `operations` | Station monitoring, maintenance tracking, utilization data | Map, Station List, Utilization, Maintenance |
| `finance` | Cost analytics, energy consumption, budget reporting | Cost/Energy Dashboard, Reports |
| `leadership` | Executive KPIs, high-level trends, program health | Executive Summary |

- **Password Security:** User passwords are hashed using SHA-256 via the Web Crypto API before storage. Plaintext passwords are never stored or logged.

#### API Security

- **ChargePoint API Authentication:** Communication with ChargePoint's SOAP API uses WS-Security (OASIS Web Services Security) with username/password tokens embedded in the SOAP header. Credentials are stored as encrypted Cloudflare Worker secrets, never in source code or configuration files.
- **Worker Secrets Management:** All sensitive credentials (`CHARGEPOINT_API_KEY`, `CHARGEPOINT_API_PASSWORD`, `JWT_SECRET`) are stored as Cloudflare Worker encrypted environment variables, accessible only at runtime within the Worker execution context.
- **Input Validation:** All API endpoints validate input parameters, enforce type constraints, and reject malformed requests with appropriate HTTP error codes (400, 401, 404, 409).
- **CORS Policy:** Cross-origin resource sharing is configured on all `/api/*` routes, restricting allowed methods (GET, POST, PUT, DELETE) and headers (Content-Type, Authorization).
- **Global Error Handling:** A centralized error handler prevents internal error details from leaking to API consumers. All unhandled exceptions return a generic 500 response.
- **XML Injection Prevention:** All values interpolated into SOAP/XML requests are escaped using a dedicated `escapeXml()` function that handles `&`, `<`, `>`, and `"` characters.

#### Infrastructure Security

- **DDoS Protection:** Cloudflare's network-level DDoS mitigation is active by default, providing automatic detection and mitigation of volumetric, protocol, and application-layer attacks.
- **No PII Stored:** The platform stores only station metadata, charging session records (energy and cost), and operational user accounts. No driver personal information, payment data, or vehicle identification is collected or stored.
- **Edge Isolation:** Each Worker invocation executes in an isolated V8 runtime with no shared memory between requests, preventing cross-request data leakage.

### 5.2 Zero Trust Model (Phase 2 Roadmap)

The following security enhancements are planned for Phase 2 to align with zero trust architecture principles:

| Enhancement | Description | Priority |
|------------|-------------|----------|
| **Cloudflare Access Integration** | Replace custom JWT auth with Cloudflare Access for SSO, device posture checks, and identity-aware proxying. Enables hardware key and biometric authentication. | High |
| **Azure AD / Microsoft 365 SSO** | Integrate with the City of Charlotte's existing Microsoft 365 tenant for single sign-on. City staff authenticate with their existing credentials. | High |
| **mTLS for API Communication** | Implement mutual TLS between the Worker and ChargePoint API for certificate-based authentication in addition to WS-Security credentials. | Medium |
| **API Rate Limiting** | Enforce per-role rate limits on API endpoints to prevent abuse and ensure fair resource allocation. | Medium |
| **Comprehensive Audit Logging** | Log all user actions (logins, data access, exports, configuration changes) with timestamps, user identity, and IP addresses. Store in D1 with 12-month retention. | Medium |
| **D1 Encryption at Rest** | Enable database-level encryption for D1 when available from Cloudflare, providing an additional layer of data protection. | Medium |
| **IP Allowlisting** | Restrict admin function access to City of Charlotte network IP ranges via Cloudflare Access policies. | Low |
| **Session Idle Timeout** | Implement automatic session invalidation after 30 minutes of inactivity, reducing risk from unattended terminals. | Low |
| **Principle of Least Privilege** | Refine RBAC to enforce endpoint-level permissions, ensuring each role can only access API routes relevant to their function. | Low |

### 5.3 Compliance Considerations

| Framework | Status | Details |
|-----------|--------|---------|
| **Data Residency** | Compliant | All data is stored within the United States. Cloudflare D1 and R2 resources are provisioned in the ENAM (Eastern North America) region. No data leaves US jurisdiction. |
| **SOC 2 Type II** | Inherited | Cloudflare maintains SOC 2 Type II certification for its infrastructure services. The platform inherits these controls for compute, storage, and network layers. |
| **NIST Cybersecurity Framework** | Aligned | The architecture addresses all five NIST CSF functions: Identify (asset inventory in D1), Protect (encryption, authentication, RBAC), Detect (sync logs, status monitoring), Respond (maintenance tracking, error handling), Recover (R2 archives, D1 point-in-time recovery). |
| **Municipal Data Governance** | Compliant | No PII is collected or stored. Data classification is limited to operational station data and aggregated usage metrics. User accounts contain only business email addresses and role assignments. |
| **CJIS / Criminal Justice** | Not Applicable | The platform processes no criminal justice data. |
| **HIPAA** | Not Applicable | The platform processes no health information. |
| **PCI DSS** | Not Applicable | The platform processes no payment card data. ChargePoint handles all driver billing independently. |

---

## 6. Infrastructure & Hosting

### 6.1 Platform Components

| Component | Service | Purpose | SLA |
|-----------|---------|---------|-----|
| **Frontend Hosting** | Cloudflare Pages | Global CDN distribution of the React SPA. Assets are deployed to 300+ edge locations worldwide. Automatic HTTPS, HTTP/2, and Brotli compression. | 99.99% |
| **Serverless Compute** | Cloudflare Workers | Edge-executed API routes and cron jobs. Each request executes in an isolated V8 runtime at the nearest edge location. Zero cold starts. | 99.99% |
| **Database** | Cloudflare D1 | Distributed SQLite database with automatic replication. ACID-compliant transactions. Point-in-time recovery with 30-day retention. | 99.9% |
| **Object Storage** | Cloudflare R2 | S3-compatible object storage for raw API response archival. Zero egress fees. Geographic redundancy within the US. | 99.9% |

### 6.2 Cost Analysis

| Resource | Included (Free Tier) | Current Usage (Est.) | Monthly Cost (Est.) |
|----------|---------------------|---------------------|-------------------|
| Workers Requests | 10M/month | ~200K/month | $0 |
| Workers CPU Time | 30M ms/month | ~5M ms/month | $0 |
| D1 Storage | 5 GB | ~50 MB | $0 |
| D1 Reads | 25B/month | ~500K/month | $0 |
| D1 Writes | 50M/month | ~100K/month | $0 |
| R2 Storage | 10 GB/month | ~500 MB/month | $0 |
| R2 Operations | 10M Class A, 10M Class B | ~50K/month | $0 |
| Pages Deployments | 500/month | ~20/month | $0 |
| **Total Estimated** | | | **$0 - $5/month** |

The platform operates well within Cloudflare's included tier allocations for the current station count and user base. Costs scale linearly and predictably with usage.

### 6.3 Scalability

The platform architecture supports significant growth without configuration changes:

- **10x Traffic:** The serverless model auto-scales horizontally. Cloudflare Workers can handle millions of requests per second across their global network with no provisioning required.
- **10x Stations:** D1 supports databases up to 10 GB. The current schema would support 2,000+ stations with full session history before approaching storage limits.
- **10x Users:** The JWT-based authentication model is stateless and requires no session storage scaling. Cloudflare Access (Phase 2) supports up to 50 users on the free tier.
- **Geographic Expansion:** The edge-native architecture performs identically regardless of user location. Adding users in other North Carolina municipalities requires zero infrastructure changes.

---

## 7. API Architecture

### 7.1 Design Principles

The REST API follows these conventions:

- **JSON Request/Response:** All API endpoints accept and return JSON (`Content-Type: application/json`).
- **RESTful Resource Naming:** Endpoints follow standard REST conventions (`GET` for reads, `POST` for creates, `PUT` for updates).
- **Consistent Error Format:** All errors return `{ "error": "<message>" }` with appropriate HTTP status codes.
- **Pagination:** List endpoints support `limit` and `offset` query parameters with a maximum page size of 200 records.
- **Filtering:** List endpoints support query parameter-based filtering (e.g., `?status=FAULTED&org=City+of+Charlotte`).

### 7.2 Authentication Flow

```
┌──────────┐          ┌──────────────┐          ┌────────┐
│  Client   │          │  Worker API   │          │  D1    │
└─────┬────┘          └──────┬───────┘          └───┬────┘
      │  POST /api/auth/login │                     │
      │  { email, password }  │                     │
      │──────────────────────▶│                     │
      │                       │  SELECT user        │
      │                       │  WHERE email = ?    │
      │                       │────────────────────▶│
      │                       │  user record        │
      │                       │◀────────────────────│
      │                       │                     │
      │                       │  SHA-256(password)  │
      │                       │  == password_hash?  │
      │                       │                     │
      │  { token, user }      │                     │
      │◀──────────────────────│                     │
      │                       │                     │
      │  GET /api/stations    │                     │
      │  Authorization:       │                     │
      │    Bearer <token>     │                     │
      │──────────────────────▶│                     │
      │                       │  Verify JWT         │
      │                       │  (HMAC-SHA256)      │
      │                       │  Check expiry       │
      │                       │                     │
      │  { stations: [...] }  │                     │
      │◀──────────────────────│                     │
```

### 7.3 Error Handling

| HTTP Status | Meaning | When Used |
|-------------|---------|-----------|
| `200 OK` | Success | Successful GET, PUT requests |
| `201 Created` | Resource created | Successful POST requests |
| `400 Bad Request` | Invalid input | Missing required fields, invalid parameter types, invalid role values |
| `401 Unauthorized` | Authentication failure | Invalid credentials, expired JWT token |
| `404 Not Found` | Resource not found | Station ID or user ID does not exist |
| `409 Conflict` | Duplicate resource | Email address already registered |
| `500 Internal Server Error` | Server error | Unhandled exceptions (generic message returned, details logged internally) |

---

## 8. Data Sync Architecture

### 8.1 ChargePoint Integration

The platform integrates with ChargePoint's SOAP/XML API version 5.0, the standard enterprise API for ChargePoint network operators.

**API Endpoint:** `https://webservices.chargepoint.com/webservices/chargepoint/services/5.0`

**Authentication Method:** WS-Security (OASIS Web Services Security 1.0)

The SOAP envelope includes a WS-Security header with username/password tokens for each request:

```xml
<soap:Header>
  <wsse:Security>
    <wsse:UsernameToken>
      <wsse:Username>[API_KEY]</wsse:Username>
      <wsse:Password>[API_PASSWORD]</wsse:Password>
    </wsse:UsernameToken>
  </wsse:Security>
</soap:Header>
```

### 8.2 Sync Schedule

| Cron Expression | Frequency | Sync Operation | Data Retrieved | Purpose |
|----------------|-----------|---------------|----------------|---------|
| `*/30 * * * *` | Every 30 minutes | Station Status Sync | `getStationStatus` — real-time status for all stations (AVAILABLE, OCCUPIED, FAULTED, UNREACHABLE) | Operational monitoring; powers the map view and status dashboard |
| `0 */2 * * *` | Every 2 hours | Session Sync | `getChargingSessionData` — individual charging sessions with energy (kWh) and duration | Usage analytics; powers utilization charts and session history |
| `0 6 * * *` | Daily at 6:00 AM UTC | Energy Aggregation | Internal computation from `sessions` table | Pre-computes daily energy/cost rollups per station for efficient dashboard queries |

### 8.3 API Methods Used

| SOAP Action | Purpose | Response Data |
|------------|---------|---------------|
| `getStationStatus` | Retrieve real-time operational status for all stations | Station ID, status (AVAILABLE/INUSE/FAULTED), port number |
| `getChargingSessionData` | Retrieve charging session records within a time range | Session ID, station ID, start/end time, energy delivered (kWh), port number |
| `getStations` | Retrieve full station metadata (hardware, location, configuration) | Station name, address, coordinates, org, connector type, serial number, MAC address |
| `getTransactionData` | Retrieve financial transaction records within a time range | Transaction details for cost analysis |

### 8.4 Error Handling and Retry Logic

The sync pipeline implements resilient error handling:

1. **HTTP 403 Retry:** ChargePoint's infrastructure may issue HTTP 403 responses during transient protection events. The client automatically retries up to 3 times with exponential backoff (2s, 4s, 6s delays).
2. **SOAP Fault Detection:** The client inspects response bodies for SOAP `<Fault>` elements and extracts the `<faultstring>` message for error logging.
3. **Credential Validation:** The client validates that API credentials are configured before attempting any SOAP request, failing fast with a descriptive error if credentials are missing.
4. **Status Normalization:** Incoming status values are normalized to a consistent set (AVAILABLE, OCCUPIED, FAULTED, UNREACHABLE) to handle variations in ChargePoint's response format (e.g., "INUSE" and "IN USE" both map to "OCCUPIED").
5. **Sync Logging:** Every sync operation records its result (success/error), record count, and any error message to the `sync_logs` table for operational monitoring.

### 8.5 Raw Response Archival

Every SOAP response is archived to Cloudflare R2 with the following key structure:

```
clt-ev-archive/
  chargepoint/
    2026-03-22/
      getStationStatus_2026-03-22T14-30-00-000Z.xml
      getChargingSessionData_2026-03-22T16-00-00-000Z.xml
    2026-03-23/
      ...
```

This archive serves three purposes:
- **Audit Trail:** Complete record of all data received from ChargePoint for compliance and dispute resolution.
- **Data Recovery:** Enables reconstruction of database state from raw source data if needed.
- **Debugging:** Provides exact API responses for troubleshooting data discrepancies or sync issues.

---

## 9. Frontend Architecture

### 9.1 Application Structure

The dashboard is a React single-page application built with Vite, providing fast initial loads and instant navigation between views.

```
dashboard/
  src/
    components/       Map, Charts, Tables, KPI cards, Filters
    pages/            MapView, Utilization, Cost, Executive, Admin
    lib/              API client, auth hooks, formatters
  public/             Static assets (logo, favicon)
  index.html          SPA entry point
```

### 9.2 Key Capabilities

| Feature | Technology | Description |
|---------|-----------|-------------|
| **Interactive Map** | Mapbox GL JS | WebGL-rendered map displaying all 208 stations with color-coded status markers. Supports clustering, click-to-detail, and filter-by-region. |
| **Analytics Charts** | Recharts | Utilization bar charts, energy trend lines, cost breakdowns, and session heatmaps. All charts are responsive and support date range selection. |
| **Data Tables** | Custom React | Searchable, sortable station lists with column filtering. Support for CSV export of visible data. |
| **KPI Dashboard** | Custom React | Executive summary cards showing total stations, sessions, energy delivered, estimated CO2 offset, uptime percentage, and cost metrics with period-over-period trends. |
| **Responsive Design** | Tailwind CSS | Mobile-first responsive layout supporting desktop (1280px+), tablet (768px-1279px), and mobile (320px-767px) viewports. |

### 9.3 City of Charlotte Brand Compliance

The dashboard adheres to the City of Charlotte Visual Style Guide (v3.1, Fall 2022):

| Element | Specification |
|---------|--------------|
| **Primary Color** | Dark Charlotte Green `#24824A` — headers, primary actions, navigation |
| **Accent Color** | Light Charlotte Green `#71BF44` — highlights, AVAILABLE status |
| **Typography** | Proxima Nova (headings, UI) / Century Gothic (data, tables) |
| **Status Colors** | Green `#71BF44` (Available), Blue `#2F70B8` (Occupied), Orange `#EA983E` (Unreachable), Red `#DE0505` (Faulted) |
| **Chart Palette** | Blue `#2F70B8`, Med Blue `#02508E`, Dark Teal `#0A7D8C`, Light Teal `#00A79C`, Purple `#59489F` — selected for accessibility and contrast |
| **Logo** | City of Charlotte crown logo used in navigation bar per identity guide specifications |

### 9.4 Accessibility

- Semantic HTML structure with appropriate heading hierarchy
- Color contrast ratios meeting WCAG 2.1 AA standards
- Keyboard-navigable interactive elements
- Screen reader-compatible chart alternatives (data tables)
- Focus state indicators on all interactive controls

---

## 10. Development & Deployment

### 10.1 Version Control

- **Repository:** GitHub (private repository)
- **Branching Strategy:** Feature branches merged to `main` via pull request
- **Code Review:** All changes reviewed before merge

### 10.2 CI/CD Pipeline

```
Developer Push
      │
      ▼
┌─────────────┐     ┌────────────────┐     ┌──────────────────┐
│  GitHub      │────▶│  Cloudflare    │────▶│  Production      │
│  Repository  │     │  Pages Build   │     │  (Global CDN)    │
│              │     │                │     │                  │
│  main branch │     │  - npm install │     │  Dashboard:      │
│              │     │  - tsc -b      │     │  Cloudflare Pages│
│              │     │  - vite build  │     │                  │
│              │     │                │     │  API:            │
│              │     │  wrangler      │     │  Cloudflare      │
│              │     │  deploy        │     │  Workers         │
└─────────────┘     └────────────────┘     └──────────────────┘
```

- **Automatic Deployment:** Pushes to `main` trigger automatic builds and deployments via Cloudflare Pages.
- **Preview Deployments:** Pull requests generate unique preview URLs for testing before merge.
- **Rollback:** Previous deployments are retained and can be instantly rolled back from the Cloudflare dashboard.

### 10.3 Environment Management

| Environment | Purpose | URL Pattern |
|------------|---------|-------------|
| **Development** | Local development with Wrangler dev server | `localhost:8787` (API), `localhost:5173` (Dashboard) |
| **Preview** | Automated PR preview deployments | `<branch>.clt-ev-dashboard.pages.dev` |
| **Production** | Live environment serving city staff | Custom domain via Cloudflare Pages |

### 10.4 Build Dependencies

The build process requires only Node.js and npm. There are no external service dependencies during the build phase:

- `tsc -b` — TypeScript compilation and type checking
- `vite build` — Frontend bundling, tree-shaking, and asset optimization
- `wrangler deploy` — Worker deployment to Cloudflare's edge network

### 10.5 Type Safety

TypeScript is used across both the frontend and backend codebases, providing:

- Compile-time error detection for API contract mismatches
- Strongly typed database query results via interface definitions
- Shared type definitions for `Station`, `Session`, `EnergyReading`, `User`, `SyncLog`, and `JWTPayload`
- IDE-level autocompletion and refactoring support

---

## 11. Professional Team

| Role | Responsibility |
|------|---------------|
| **Solutions Architect** | System design, ChargePoint API integration strategy, security architecture, Cloudflare infrastructure planning, and technology selection |
| **Full-Stack Engineers** | React dashboard development, Cloudflare Workers API implementation, D1 schema design, and end-to-end feature delivery |
| **Data Engineer** | ChargePoint SOAP/XML integration, data sync pipeline development, ETL logic, energy aggregation algorithms, and data quality assurance |
| **UI/UX Designer** | City of Charlotte brand compliance, responsive layout design, data visualization design, and accessibility standards |
| **QA Engineer** | Cross-browser testing, API validation, data integrity verification, and edge case coverage |
| **DevOps Engineer** | Cloudflare infrastructure management, CI/CD pipeline configuration, environment management, monitoring, and incident response |

Built by **Lighthouse 27 LLC**, a technology consultancy specializing in municipal and enterprise cloud solutions. Lighthouse 27 combines deep expertise in modern serverless architectures with experience delivering mission-critical platforms for government organizations.

---

## 12. Roadmap

The following enhancements are planned for Phase 2 and beyond, prioritized by impact and stakeholder need:

| Priority | Feature | Description | Estimated Effort |
|----------|---------|-------------|-----------------|
| 1 | **Cloudflare Access / Azure AD SSO** | Replace custom JWT authentication with Cloudflare Access integrated with the City's Microsoft 365 / Azure AD tenant. Enables single sign-on, device posture verification, and centralized identity management. | Medium |
| 2 | **Duke Energy Rate Schedule Integration** | Integrate Duke Energy's commercial rate schedules to calculate precise electricity costs per station, replacing the current estimated cost model. Enables accurate budget forecasting by org unit. | Medium |
| 3 | **PDF Report Generation** | Automated monthly, quarterly, and annual PDF reports for budget submissions and council presentations. Includes KPI summaries, charts, and trend analysis formatted for print. | Low |
| 4 | **Email/SMS Alerts for Station Faults** | Real-time notifications when stations transition to FAULTED or UNREACHABLE status. Configurable recipients by org unit and station group. | Low |
| 5 | **Public-Facing Charger Availability Kiosk** | A simplified, read-only view showing real-time station availability for public EV drivers. Deployable on city website or at charging locations via kiosk hardware. | Medium |
| 6 | **Fleet Vehicle Tracking Integration** | Integration with fleet management systems to correlate vehicle usage with charging data. Enables fleet-specific utilization analysis and charge scheduling optimization. | High |
| 7 | **Historical Data Export and BI Tool Integration** | Scheduled data exports to the city's business intelligence tools (Tableau, Power BI). Includes standardized CSV/JSON exports and optional direct database connector. | Medium |

---

## Appendix A: API Endpoint Reference

### Authentication

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `POST` | `/api/auth/login` | No | Authenticate with email and password. Returns JWT token and user profile. |

### Stations

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `GET` | `/api/stations` | Yes | List all stations. Supports query filters: `status`, `org`, `is_public`. |
| `GET` | `/api/stations/orgs` | Yes | List distinct organization names for filter dropdowns. |
| `GET` | `/api/stations/:id` | Yes | Get station detail by ID, including recent charging sessions. |

### Sessions

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `GET` | `/api/sessions` | Yes | List charging sessions with pagination. Filters: `station`, `start_date`, `end_date`. Pagination: `limit` (max 200), `offset`. |

### Statistics

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `GET` | `/api/stats` | Yes | Aggregate KPIs: total stations, sessions, energy, cost, uptime. |
| `GET` | `/api/stats/utilization` | Yes | Utilization analytics: top/bottom stations, heatmap data, trends. |
| `GET` | `/api/stats/energy` | Yes | Energy and cost time series. Filters: `start_date`, `end_date`. |

### Maintenance

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `GET` | `/api/maintenance` | Yes | List maintenance logs. Filters: `status`, `issue_type`. |
| `POST` | `/api/maintenance` | Yes | Create a maintenance log entry. Required: `station_charger_id`, `issue_type`. |
| `PUT` | `/api/maintenance/:id` | Yes | Update maintenance log status, notes, resolution timestamp, or assignment. |

### User Administration

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `GET` | `/api/users` | Yes (Admin) | List all user accounts (password hashes excluded). |
| `POST` | `/api/users` | Yes (Admin) | Create a new user. Required: `email`, `name`, `role`, `password`. |
| `PUT` | `/api/users/:id` | Yes (Admin) | Update user name, role, or active status. |

### System Operations

| Method | Path | Auth Required | Description |
|--------|------|:------------:|-------------|
| `GET` | `/api/health` | No | Health check endpoint. Returns `{ status: "ok", timestamp }`. |
| `GET` | `/api/sync-logs` | Yes (Admin) | Retrieve recent sync operation logs. Query: `limit` (max 200). |
| `POST` | `/api/sync/stations` | Yes (Admin) | Manually trigger station status synchronization. |
| `POST` | `/api/sync/sessions` | Yes (Admin) | Manually trigger charging session synchronization. |
| `POST` | `/api/sync/energy` | Yes (Admin) | Manually trigger daily energy aggregation. |
| `POST` | `/api/sync/reimport` | Yes (Admin) | Full station re-import: clears and re-fetches all stations from ChargePoint API. |
| `POST` | `/api/sync/map-ids` | Yes (Admin) | Map ChargePoint station IDs to internal database records. |

---

## Appendix B: Database Schema

```sql
-- =============================================================================
-- CLT EV Charging Analytics Platform — Database Schema
-- Database: Cloudflare D1 (Distributed SQLite)
-- Version: 1.0
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STATIONS: Master record for all 208 charging stations
-- Source: ChargePoint API (getStations) + CSV seed data
-- Updated: Every 30 minutes via station status sync
-- -----------------------------------------------------------------------------
CREATE TABLE stations (
  id                        INTEGER PRIMARY KEY,
  charger_id                TEXT NOT NULL,
  company_id                TEXT,
  connector_format           TEXT,
  connector_name             TEXT,
  connectors_id              TEXT,
  country                    TEXT,
  country_code               TEXT,
  county                     TEXT,
  evse_id                    TEXT,
  evse_name                  TEXT,
  floor_label                TEXT,
  is_public                  BOOLEAN,
  mac_address                TEXT,
  max_amperage               TEXT,
  max_voltage                TEXT,
  org_name                   TEXT,
  party_id                   TEXT,
  power_type                 TEXT,
  provider_id                TEXT,
  provision_status           TEXT,
  scheduled_charging_policy  TEXT,
  site_id                    TEXT,
  station_address            TEXT,
  station_city               TEXT,
  station_id                 TEXT,
  station_lat                REAL,
  station_lng                REAL,
  station_state              TEXT,
  station_status             TEXT,
  station_zip                TEXT,
  system_serial              TEXT,
  timezone                   TEXT,
  utility_name               TEXT,
  utility_plan               TEXT,
  warranty_type              TEXT,
  last_status_change         DATETIME,
  created_at                 DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- SESSIONS: Individual charging session records
-- Source: ChargePoint API (getChargingSessionData)
-- Updated: Every 2 hours via session sync
-- -----------------------------------------------------------------------------
CREATE TABLE sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id          TEXT UNIQUE,
  station_charger_id  TEXT,
  user_id             TEXT,
  start_time          DATETIME,
  end_time            DATETIME,
  energy_kwh          REAL,
  cost_usd            REAL,
  port_number         INTEGER,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- ENERGY_READINGS: Daily aggregated energy and cost snapshots
-- Source: Computed from sessions table
-- Updated: Daily at 6:00 AM UTC via energy aggregation job
-- -----------------------------------------------------------------------------
CREATE TABLE energy_readings (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  station_charger_id       TEXT,
  reading_date             DATE,
  total_kwh                REAL,
  total_cost               REAL,
  session_count            INTEGER,
  avg_session_duration_min REAL,
  created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(station_charger_id, reading_date)
);

-- -----------------------------------------------------------------------------
-- USERS: Dashboard user accounts with role-based access control
-- Roles: admin, operations, finance, leadership
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('admin', 'operations', 'finance', 'leadership')),
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT 1,
  last_login    DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- SYNC_LOGS: API synchronization health tracking
-- Records success/failure of each sync operation for monitoring
-- -----------------------------------------------------------------------------
CREATE TABLE sync_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type         TEXT NOT NULL,
  status            TEXT NOT NULL CHECK(status IN ('success', 'error')),
  records_processed INTEGER DEFAULT 0,
  error_message     TEXT,
  started_at        DATETIME,
  completed_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- STATION_STATUS_HISTORY: Status change audit trail
-- Tracks every status transition for uptime analysis
-- -----------------------------------------------------------------------------
CREATE TABLE station_status_history (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  station_charger_id  TEXT,
  old_status          TEXT,
  new_status          TEXT,
  changed_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MAINTENANCE_LOGS: Station maintenance tracking
-- Issue types: FAULTED, UNREACHABLE, DAMAGED, SCHEDULED, OTHER
-- Status workflow: open -> in_progress -> resolved
-- -----------------------------------------------------------------------------
CREATE TABLE maintenance_logs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  station_charger_id  TEXT NOT NULL,
  station_name        TEXT,
  reported_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at         DATETIME,
  issue_type          TEXT NOT NULL CHECK(issue_type IN (
                        'FAULTED','UNREACHABLE','DAMAGED','SCHEDULED','OTHER'
                      )),
  description         TEXT,
  assigned_to         TEXT,
  status              TEXT NOT NULL DEFAULT 'open' CHECK(status IN (
                        'open','in_progress','resolved'
                      )),
  notes               TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES: Optimized for common dashboard query patterns
-- =============================================================================

-- Station queries: filter by status, org unit
CREATE INDEX idx_stations_status    ON stations(station_status);
CREATE INDEX idx_stations_org       ON stations(org_name);

-- Session queries: lookup by station, filter by time range
CREATE INDEX idx_sessions_station   ON sessions(station_charger_id);
CREATE INDEX idx_sessions_time      ON sessions(start_time);

-- Energy queries: lookup by station + date for daily rollups
CREATE INDEX idx_energy_station_date ON energy_readings(station_charger_id, reading_date);

-- Sync log queries: filter by type, order by completion time
CREATE INDEX idx_sync_type          ON sync_logs(sync_type, completed_at);

-- Status history queries: station timeline analysis
CREATE INDEX idx_status_history     ON station_status_history(station_charger_id, changed_at);

-- Maintenance queries: filter by status and station
CREATE INDEX idx_maintenance_status  ON maintenance_logs(status);
CREATE INDEX idx_maintenance_station ON maintenance_logs(station_charger_id);
```

---

*Document prepared by Lighthouse 27 LLC. All information contained herein is confidential and intended solely for the use of the City of Charlotte, Office of the CTO. Unauthorized distribution is prohibited.*

*For questions regarding this document, contact Lighthouse 27 LLC.*
