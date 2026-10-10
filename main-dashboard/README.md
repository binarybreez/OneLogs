<p align="center">
  <img
    alt="One Log Dashboard"
    src="https://shieldcn.dev/header/graph.svg?title=One+Log+Dashboard&subtitle=Monitor+%26+Query+Your+Logs+in+Real+Time&mode=dark&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1551288049-bebda4e38f71%3Fw%3D1600%26q%3D70%26fit%3Dcrop%26fm%3Djpg"
  />
</p>

<p align="center">
  <strong>The developer dashboard for One Log.</strong>
</p>

<p align="center">
  Create API keys • Monitor live logs • Search • Query • Explore
</p>

<p align="center">
  <img src="https://shieldcn.dev/badge/Next.js.svg?variant=branded&brand=nextdotjs" alt="Next.js" />
  <img src="https://shieldcn.dev/badge/TypeScript.svg?variant=branded&brand=typescript" alt="TypeScript" />
  <img src="https://shieldcn.dev/badge/TailwindCSS.svg?variant=branded&brand=tailwindcss" alt="Tailwind CSS" />
  <img src="https://shieldcn.dev/badge/Docker.svg?variant=branded&brand=docker" alt="Docker" />
  <img src="https://shieldcn.dev/flag/in.svg" alt="Built in India" />
</p>

---

# 📊 One Log Dashboard

**One Log Dashboard** is the web interface for the One Log observability platform.

Built with **Next.js**, it provides developers and engineering teams with a centralized interface to manage their log ingestion credentials, monitor logs in real time, and search and query stored log data.

> **Connect your application. Watch your logs. Find what matters.**

---

##  What Can You Do?

###  Create & Manage API Keys

Generate API keys that applications can use to send logs to One Log.

The dashboard provides a central place to:

- Create API keys
- Name keys by application or service
- View key metadata
- Revoke keys
- Manage application credentials
- Connect services to One Log

Example:

```text
┌────────────────────────────────────────────────────────┐
│ API Keys                                                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  production-api       •••••••••••••    Active          │
│  payment-service      •••••••••••••    Active          │
│  development          •••••••••••••    Revoked         │
│                                                        │
│                                  + Create API Key       │
└────────────────────────────────────────────────────────┘
```

---

#  Live Log Monitoring

See application logs as they arrive.

The dashboard connects to the One Log streaming infrastructure to provide a live view of incoming events.

```text
┌────────────────────────────────────────────────────────────┐
│ Live Logs                                    ● Connected    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  12:41:32  INFO   API request completed                    │
│  12:41:31  INFO   User authenticated                       │
│  12:41:29  WARN   High request latency                     │
│  12:41:28  INFO   Payment initiated                        │
│  12:41:26  ERROR  Payment provider timeout                 │
│                                                            │
│                          ↓ new logs appear here             │
└────────────────────────────────────────────────────────────┘
```

### Live monitoring capabilities

- Real-time log streaming
- Automatic updates
- Log-level filtering
- Service filtering
- Environment filtering
- Timestamp inspection
- Structured metadata
- Log detail view
- Pause/resume live stream

---

# 🔍 Log Explorer

When you need to investigate something that happened earlier, switch from live monitoring to the **Log Explorer**.

Search through stored logs using filters and queries.

```text
┌─────────────────────────────────────────────────────────────┐
│ Search logs...                                              │
├─────────────────────────────────────────────────────────────┤
│ Service       Level       Environment       Time             │
│ payment       ERROR       production       Last 24 hours    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 12:31:44  ERROR  Payment provider timeout                  │
│ 12:30:21  ERROR  Failed to process payment                  │
│ 11:58:09  ERROR  Database connection failed                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#  Query Your Logs

One Log Dashboard provides a query interface on top of the ClickHouse log storage layer.

Developers can investigate logs using structured conditions.

Example:

```text
service = "payment-service"
AND level = "error"
AND environment = "production"
```

Or:

```text
statusCode >= 500
AND timestamp > now() - 1h
```

The dashboard translates these queries into requests to the One Log backend and ClickHouse query layer.

### Query capabilities

- Field-based filtering
- Log-level filtering
- Service filtering
- Environment filtering
- Time-range queries
- Full-text search
- Sorting
- Pagination
- Aggregations
- Structured metadata filtering

---

#  Dashboard Structure

The dashboard is organized around the core workflow of working with logs.

```text
                    One Log Dashboard
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     API Keys         Live Logs        Log Explorer
          │                │                │
          │                │                ▼
          │                │             Search
          │                │                │
          │                │                ▼
          │                │             Filters
          │                │                │
          │                │                ▼
          │                │              Query
          │                │
          │                ▼
          │             Streaming
          │
          ▼
       Ingestion
```

---

#  Architecture

The dashboard sits on top of the One Log backend and streaming infrastructure.

```text
                         Applications
                              │
                              │ API Key
                              ▼
                    ┌───────────────────┐
                    │   One Log API     │
                    │      NestJS       │
                    └─────────┬─────────┘
                              │
                              ▼
                       ┌────────────┐
                       │    NATS    │
                       │   Stream   │
                       └─────┬──────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
          Live Log Stream          Log Storage
                 │                       │
                 │                 ┌────────────┐
                 │                 │ ClickHouse │
                 │                 └─────┬──────┘
                 │                       │
                 └──────────┬────────────┘
                            ▼
                  ┌────────────────────┐
                  │  One Log Dashboard │
                  │      Next.js       │
                  └────────────────────┘
```

---

#  Core Dashboard Sections

## Overview

A central place to understand what's happening across your applications.

Planned dashboard information includes:

- Incoming logs
- Error counts
- Warning counts
- Log volume
- Active services
- Recent events
- System status

---

## API Keys

Manage the credentials used by applications to send logs.

```text
API Keys
│
├── Create
├── View
├── Revoke
└── Manage
```

---

## Live Logs

A real-time view of incoming events.

```text
Live Logs
│
├── Stream
├── Filter
├── Pause
├── Resume
└── Inspect
```

---

## Log Explorer

Explore historical logs stored in ClickHouse.

```text
Log Explorer
│
├── Search
├── Filter
├── Query
├── Sort
├── Aggregate
└── Inspect
```

---

#  Developer Workflow

One Log Dashboard is designed around a simple workflow:

```text
1. Create API Key
        │
        ▼
2. Connect Application
        │
        ▼
3. Send Logs
        │
        ▼
4. Open Live Logs
        │
        ▼
5. Monitor Events
        │
        ▼
6. Search Historical Logs
        │
        ▼
7. Query & Investigate
```

The goal is to keep the experience simple:

> **Create → Connect → Monitor → Investigate**

---

#  Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js** | Dashboard application |
| **TypeScript** | Type-safe development |
| **React** | UI architecture |
| **Tailwind CSS** | Styling |
| **One Log API** | Backend communication |
| **NATS** | Real-time log streaming |
| **ClickHouse** | Log querying and storage |
| **Docker** | Deployment |

---

#  Project Structure

```text
one-log-dashboard/
│
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── api-keys/
│   │   ├── live-logs/
│   │   └── explorer/
│   │
│   ├── login/
│   └── layout.tsx
│
├── components/
│   ├── dashboard/
│   ├── api-keys/
│   ├── logs/
│   ├── log-explorer/
│   └── ui/
│
├── lib/
│   ├── api/
│   ├── logs/
│   └── queries/
│
├── hooks/
│   ├── use-live-logs.ts
│   └── use-log-query.ts
│
├── types/
│
├── public/
│
└── package.json
```

---

#  Getting Started

## Prerequisites

Make sure you have:

- Node.js
- Bun or npm
- One Log backend running
- NATS
- ClickHouse

---

## Installation

```bash
git clone https://github.com/your-username/one-log-dashboard.git

cd one-log-dashboard
```

Install dependencies:

```bash
bun install
```

---

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_LOG_STREAM_URL=http://localhost:3002
```

Configure these values according to your One Log backend environment.

---

## Run Development Server

```bash
bun run dev
```

The dashboard will be available at:

```text
http://localhost:3000
```

---

#  Roadmap

## ✅ Phase 1 — Dashboard Foundation

- [x] Next.js dashboard
- [x] API key generation
- [x] API key management
- [x] Backend API integration
- [x] Live log streaming integration
- [x] Log storage integration

## 🚧 Phase 2 — Monitoring & Querying

- [ ] Live log dashboard
- [ ] Real-time log updates
- [ ] Log filtering
- [ ] Log search
- [ ] Log Explorer
- [ ] Query builder
- [ ] ClickHouse query integration
- [ ] Advanced filtering
- [ ] Log aggregation
- [ ] Log detail inspection
- [ ] Saved queries

## 🔮 Phase 3 — Advanced Monitoring

- [ ] Log volume analytics
- [ ] Error-rate visualization
- [ ] Service health overview
- [ ] Custom dashboards
- [ ] Alerts
- [ ] Saved filters
- [ ] Query history

## 🔮 Phase 4 — Full Observability

- [ ] Metrics
- [ ] Distributed tracing
- [ ] Service maps
- [ ] Performance monitoring
- [ ] OpenTelemetry integration
- [ ] AI-assisted investigation

---

# 🎨 Design Principles

The dashboard follows a few core principles.

### Simple

Developers should be able to start monitoring without learning a complicated observability platform.

### Fast

Log exploration should feel instantaneous, even when working with large amounts of data.

### Live

When something happens in production, the dashboard should show it as quickly as possible.

### Focused

The interface should prioritize the three things developers care about:

**What is happening?**

**What happened?**

**Why did it happen?**

### Developer First

Every part of the dashboard should make debugging and monitoring easier rather than adding unnecessary complexity.

---

# 🔐 Security

API keys are sensitive credentials.

The dashboard should:

- Never expose secret keys unnecessarily
- Show secrets only when appropriate
- Support key revocation
- Avoid storing credentials in client-side state unnecessarily
- Use authenticated backend requests
- Protect dashboard routes
- Validate API responses
- Follow secure environment-variable practices

---

#  Part of One Log

The Dashboard is one component of the larger **One Log** platform.

```text
                    ONE LOG
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
  Universal        Streaming         Storage
   Intake             NATS          ClickHouse
       │               │                │
       └───────────────┼────────────────┘
                       │
                       ▼
              One Log Dashboard
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Live Logs          Log Explorer
             │                   │
             └─────────┬─────────┘
                       ▼
                   Developers
```

The dashboard provides the **human interface** for the One Log infrastructure.

---

#  Vision

One Log Dashboard aims to give developers a single, clean interface for understanding what is happening across their applications.

No jumping between terminals.

No searching through container output.

No manually digging through scattered log files.

Just:

> **Connect → Stream → Monitor → Query → Understand**

---

<p align="center">
  Built with ❤️ in India
</p>