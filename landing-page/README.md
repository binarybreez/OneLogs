<p align="center">
  <img
    alt="One Log"
    src="https://shieldcn.dev/header/graph.svg?title=One+Log&subtitle=Universal+Log+Ingestion+%26+Real-Time+Monitoring&mode=dark&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1451187580459-43490279c0fa%3Fw%3D1600%26q%3D70%26fit%3Dcrop%26fm%3Djpg"
  />
</p>

<p align="center">
  <strong>Logs from anywhere. One place to monitor and query them.</strong>
</p>

<p align="center">
  <a href="#-why-one-log">Why One Log</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-features">Features</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-getting-started">Get Started</a>
</p>

<p align="center">
  <img src="https://shieldcn.dev/badge/TypeScript.svg?variant=branded&brand=typescript" alt="TypeScript" />
  <img src="https://shieldcn.dev/badge/NestJS.svg?variant=branded&brand=nestjs" alt="NestJS" />
  <img src="https://shieldcn.dev/badge/Next.js.svg?variant=branded&brand=nextdotjs" alt="Next.js" />
  <img src="https://shieldcn.dev/badge/NATS.svg?variant=branded" alt="NATS" />
  <img src="https://shieldcn.dev/badge/ClickHouse.svg?variant=branded" alt="ClickHouse" />
  <img src="https://shieldcn.dev/badge/Docker.svg?variant=branded&brand=docker" alt="Docker" />
  <img src="https://shieldcn.dev/flag/in.svg" alt="Built in India" />
</p>

---

#  Universal Logs. One Platform.

Modern applications generate logs everywhere.

Your backend produces logs.  
Your frontend produces logs.  
Your containers produce logs.  
Your infrastructure produces logs.  
Your services use different formats and different logging systems.

**One Log brings them together.**

> **Send logs from virtually any source → normalize them → stream them → store them → monitor and query them from one place.**

One Log is a **self-hosted universal logging and monitoring platform** built for developers and engineering teams who want control over their observability infrastructure.

---

##  The Problem

Logging becomes complicated as applications grow.

You might have:

```text
Application Logs
       │
       ├── Node.js
       ├── Python
       ├── Java
       └── Go
       
Infrastructure
       │
       ├── Docker
       ├── Kubernetes
       ├── Nginx
       └── System Logs

Services
       │
       ├── APIs
       ├── Workers
       ├── Databases
       └── Third-party Services
```

Each source can produce logs differently.

Different formats.  
Different transports.  
Different storage systems.  
Different tools.

The result?

**Fragmented observability.**

---

#  The One Log Approach

One Log introduces a **Universal Log Intake Layer**.

Instead of building separate integrations and pipelines for every source, logs enter through a common ingestion architecture.

```text
                 ANY SOURCE
                     │
        ┌────────────┼────────────┐
        │            │            │
      Apps       Infrastructure  Services
        │            │            │
        └────────────┼────────────┘
                     ▼
          ┌─────────────────────┐
          │  UNIVERSAL INTAKE   │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │   NORMALIZE &       │
          │      ENRICH         │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │     NATS STREAM     │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │     CLICKHOUSE      │
          │    LOG STORAGE      │
          └──────────┬──────────┘
                     │
              ┌──────┴──────┐
              ▼             ▼
        LIVE MONITORING   QUERYING
```

**One pipeline. Different sources. One interface.**

---

#  Why One Log?

###  Universal

Logs shouldn't have to care where they came from.

One Log is designed around a source-independent ingestion layer capable of accepting logs from different applications, frameworks, infrastructure components, and logging formats.

###  Real-Time

Logs shouldn't appear minutes after something goes wrong.

One Log uses a streaming architecture to move logs through the system in real time.

###  Queryable

Collecting millions of logs isn't useful if you can't find what matters.

One Log uses ClickHouse as its analytical storage layer, enabling fast querying and aggregation over large volumes of log data.

###  Self-Hosted

Your logs belong to you.

Run One Log inside your own infrastructure and maintain control over your:

- Data
- Infrastructure
- Retention
- Security
- Deployment
- Costs

###  Developer First

One Log is being built around a simple idea:

> **Observability infrastructure shouldn't make development harder.**

---

#  What One Log Provides

## Universal Log Intake

Bring logs from different sources into a single ingestion layer.

```text
Node.js ────────┐
Python ─────────┤
Java ───────────┤
Go ─────────────┤
Docker ─────────┤
Kubernetes ─────┤
Nginx ──────────┤───► One Log
JSON ───────────┤
HTTP ───────────┤
Custom Sources ─┘
```

The goal is to make the original source irrelevant once the log enters the platform.

---

##  Log Normalization

Different sources produce different structures.

One Log is designed to transform incoming records into a consistent representation.

```text
Raw Logs
   │
   ▼
Detection
   │
   ▼
Parsing
   │
   ▼
Normalization
   │
   ▼
Enrichment
   │
   ▼
Unified Log
```

This creates a common foundation for searching, filtering, monitoring, and analysis.

---

#  Real-Time Log Streaming

One Log uses **NATS** as the streaming layer between ingestion and downstream processing.

```text
Producer
   │
   ▼
Universal Intake
   │
   ▼
NATS
   │
   ├──────────────► Processing
   │
   ├──────────────► Storage
   │
   └──────────────► Live Monitoring
```

This decouples log producers from consumers and provides a foundation for scaling the platform as the system grows.

---

#  Analytical Log Storage

Logs are stored in **ClickHouse**, an analytical database designed for high-performance queries over large datasets.

This provides the foundation for:

- Fast log search
- Filtering
- Aggregations
- Time-based analysis
- Grouping
- Large-volume log exploration

```text
Logs
 │
 ▼
ClickHouse
 │
 ├── Search
 ├── Filter
 ├── Aggregate
 ├── Group
 └── Analyze
```

---

#  Monitor & Query

The next major step for One Log is turning the underlying infrastructure into a powerful developer-facing monitoring experience.

Imagine opening one interface and being able to:

```text
┌─────────────────────────────────────────────┐
│ Search logs...                              │
├─────────────────────────────────────────────┤
│                                             │
│  Service      Environment       Level       │
│  ─────────    ───────────       ─────       │
│  API          Production        ERROR       │
│                                             │
├─────────────────────────────────────────────┤
│  10:42:31  ERROR  Payment failed            │
│  10:42:30  INFO   Request completed         │
│  10:42:28  WARN   High latency detected     │
│  10:42:26  INFO   User authenticated        │
│                                             │
└─────────────────────────────────────────────┘
```

### Planned capabilities

- Live log streaming
- Search
- Filtering
- Querying
- Log-level filtering
- Service filtering
- Environment filtering
- Time-range filtering
- Structured metadata inspection
- Aggregations
- Query builder
- Saved queries

---

#  Your Infrastructure. Your Logs.

One Log is designed as a **self-hosted platform**.

You can deploy it within your own infrastructure instead of sending your application logs to a third-party hosted service.

```text
Your Infrastructure
        │
        ├── Applications
        ├── Services
        ├── Databases
        └── Infrastructure
                 │
                 ▼
              One Log
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      NATS   ClickHouse  UI
```

You control the deployment.

You control the data.

You control the infrastructure.

---

#  Architecture

The current architecture is built around a streaming-first pipeline.

```text
                 ┌──────────────────┐
                 │   Log Sources    │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  Log Intake API  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   NestJS API     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │    NATS Stream   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │    ClickHouse    │
                 └────────┬─────────┘
                          │
                  ┌───────┴────────┐
                  ▼                ▼
             Query Layer       Live Monitor
                  │                │
                  └───────┬────────┘
                          ▼
                   One Log UI
```

---

#  Built With

| Technology | Purpose |
|---|---|
| **TypeScript** | Application development |
| **NestJS** | Backend services |
| **NATS** | Real-time log streaming |
| **ClickHouse** | Analytical log storage |
| **Next.js** | Web interface |
| **Docker** | Deployment & infrastructure |

---

#  Roadmap

##  Phase 1 — Core Infrastructure

The foundation is already in place.

- [x] API key generation
- [x] API authentication
- [x] Log ingestion
- [x] NestJS backend service
- [x] NATS streaming
- [x] Real-time log pipeline
- [x] ClickHouse integration
- [x] Persistent log storage

---

##  Phase 2 — Universal Intake & Monitoring

**Make One Log source-independent.**

- [ ] Universal log intake
- [ ] Multiple log formats
- [ ] Source detection
- [ ] Log parsing
- [ ] Log normalization
- [ ] Metadata enrichment
- [ ] Source identification
- [ ] Live log monitoring
- [ ] Real-time log explorer
- [ ] Log search
- [ ] Advanced filtering
- [ ] Query builder
- [ ] ClickHouse query layer
- [ ] Log aggregation
- [ ] Saved queries

---

##  Phase 3 — Intelligent Processing

Move from simply collecting logs to understanding them.

- [ ] Log pattern detection
- [ ] Error grouping
- [ ] Automatic classification
- [ ] Duplicate detection
- [ ] Anomaly detection
- [ ] Intelligent correlation
- [ ] Log-based metrics
- [ ] AI-assisted debugging

---

##  Phase 4 — Full Observability

Expand One Log beyond logs.

- [ ] Metrics
- [ ] Distributed tracing
- [ ] Trace correlation
- [ ] Service dependency mapping
- [ ] Performance monitoring
- [ ] Alerting
- [ ] Custom dashboards
- [ ] OpenTelemetry compatibility

---

#  The Vision

One Log is being built toward a simple vision:

> ### **Any source. Any log. One place.**

We want developers to be able to connect their applications and infrastructure to one universal log pipeline without worrying about where their logs originated.

```text
                 ANY SOURCE
                     │
                     ▼
             ┌───────────────┐
             │  ONE LOG      │
             │               │
             │ Ingest        │
             │ Normalize     │
             │ Stream        │
             │ Store         │
             │ Monitor       │
             │ Query         │
             └───────┬───────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     Developers            Engineering
       Teams                  Teams
```

**One Log isn't just another logging SDK.**

It is being built as the infrastructure layer that connects logs from everywhere into one unified monitoring experience.

---

#  Getting Started

The project is currently under active development.

### Clone the repository

```bash
git clone https://github.com/your-username/one-log.git

cd one-log
```

### Install dependencies

```bash
bun install
```

### Start the development environment

```bash
bun run dev
```

> Documentation and deployment instructions will be expanded as the platform moves toward the universal intake phase.


---

<p align="center">

###  Logs from anywhere.

###  Monitor everything.

###  Query instantly.

###  Keep control.

**One Log.**

</p>

<p align="center">
  Built with ❤️ in India
</p>