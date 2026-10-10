<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->



# One Log Backend

The core backend service powering **One Log**.

Built with **NestJS**, this service handles log ingestion, API-key authentication, real-time log streaming, message processing, analytical storage, querying, and the infrastructure required to power the One Log Dashboard.

> **One Log Backend is the processing layer between log sources and the One Log Dashboard.**

---

## Architecture

```text
                    ┌──────────────────────┐
                    │   Log Sources        │
                    │                      │
                    │ • TypeScript SDK     │
                    │ • HTTP Sources       │
                    │ • Future SDKs        │
                    │ • Docker / K8s       │
                    │ • Syslog             │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   NestJS Backend     │
                    │                      │
                    │ • API Authentication │
                    │ • API Keys           │
                    │ • Log Ingestion      │
                    │ • Query API          │
                    │ • Analytics API      │
                    │ • Live Streaming     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │    NATS JetStream    │
                    │                      │
                    │ Durable Log Streaming │
                    │ & Message Processing  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Consumer        │
                    │                      │
                    │ Normalize / Process  │
                    │ Validate / Enrich    │
                    └───────┬────────┬─────┘
                            │        │
                  ┌─────────▼───┐  ┌─▼────────────┐
                  │ ClickHouse  │  │    Redis     │
                  │             │  │              │
                  │ Log Storage │  │ Cache /      │
                  │ Analytics   │  │ Runtime Data │
                  └──────┬──────┘  └──────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │  One Log Dashboard │
                │                    │
                │ • Live Logs        │
                │ • Log Explorer     │
                │ • Analytics        │
                │ • API Keys         │
                └────────────────────┘
```

---

# Responsibilities

##  API Key Management

The backend provides API-key based authentication for log-producing applications.

It handles:

- API key generation
- API key validation
- API key authentication
- Key ownership
- Key management
- Key revocation
- Source/application identification

The API key allows the backend to associate incoming logs with the appropriate One Log project/application.

```text
Application
     │
     │ API Key
     ▼
NestJS API
     │
     ├── Validate Key
     ├── Identify Application
     └── Accept Logs
```

---

#  Log Ingestion

The ingestion API is the entry point for logs.

A source sends structured logs to the backend:

```text
Application
     │
     │ POST /logs
     ▼
NestJS
     │
     ├── Authenticate
     ├── Validate
     ├── Enrich
     └── Publish
            │
            ▼
       NATS JetStream
```

The ingestion layer should remain lightweight.

Its primary responsibility is to accept and publish logs rather than performing expensive analytical processing synchronously.

---

#  NATS JetStream

**NATS JetStream** provides the durable streaming layer of One Log.

The backend publishes accepted logs into JetStream rather than directly writing every log to ClickHouse during the ingestion request.

```text
Log Source
    │
    ▼
NestJS
    │
    ▼
NATS JetStream
    │
    ▼
Consumer
    │
    ▼
ClickHouse
```

This provides:

- Durable message delivery
- Asynchronous processing
- Consumer-based processing
- Backpressure handling
- Separation between ingestion and storage
- Better scalability as log volume increases

---

#  ClickHouse

ClickHouse is the primary analytical storage engine for One Log.

Logs are stored in a format optimized for:

- High-volume ingestion
- Time-series queries
- Filtering
- Aggregation
- Log exploration
- Analytics
- Service-level analysis

Example queries supported by the backend:

```text
Find all ERROR logs
        ↓
Filter by service
        ↓
Filter by environment
        ↓
Filter by time range
        ↓
Return matching logs
```

ClickHouse becomes the source of truth for historical log data.

---

#  Redis

Redis is used for fast-access runtime data and caching where appropriate.

Potential responsibilities include:

- Query result caching
- Short-lived application state
- Live-stream coordination
- Backlog/state management
- Rate limiting
- Frequently accessed metadata

Redis should complement ClickHouse rather than become the primary log database.

```text
                    ┌─────────────┐
                    │   Redis     │
                    │ Fast / Temp │
                    └─────────────┘
                          ▲
                          │
NestJS ──────────────────┼────────── ClickHouse
                          │             │
                     Runtime Data   Historical Logs
```

---

#  Live Log Streaming

The backend provides real-time log delivery to the One Log Dashboard.

The flow is:

```text
Application
     │
     ▼
NestJS
     │
     ▼
NATS JetStream
     │
     ├──────────────► Consumer
     │
     └──────────────► Live Stream
                            │
                            ▼
                       Dashboard
```

This allows developers to watch logs as they arrive instead of repeatedly polling the database.

The dashboard can therefore provide:

- Live log feed
- Real-time filtering
- Service-specific streams
- Environment-specific streams
- Error monitoring

---

#  Analytics

The backend exposes analytical APIs backed primarily by ClickHouse.

Examples include:

### Log volume

```text
Logs over time
```

### Log levels

```text
INFO     ███████████████
WARN     █████
ERROR    ███
DEBUG    █████████
```

### Error rate

```text
Errors / Total Logs
```

### Service analytics

```text
Service
├── API
├── Web
├── Worker
└── Auth
```

### Time-based analysis

```text
Last 5 minutes
Last 1 hour
Last 24 hours
Last 7 days
Custom range
```

These APIs power the analytics views of the One Log Dashboard.

---

#  Log Querying

The backend provides APIs for searching and querying historical logs.

Typical query parameters include:

```text
time range
log level
service
environment
source
request ID
trace ID
search text
metadata
```

Example:

```http
GET /logs
```

```text
?level=error
&service=api
&environment=production
&from=...
&to=...
```

The NestJS query layer translates these filters into optimized ClickHouse queries.

---

#  Backend Modules

The service can be organized around domain responsibilities rather than infrastructure alone.

```text
src/
│
├── auth/
│   ├── api-key/
│   └── guards/
│
├── ingestion/
│   ├── controllers/
│   ├── services/
│   └── dto/
│
├── streaming/
│   ├── nats/
│   ├── publishers/
│   └── consumers/
│
├── logs/
│   ├── controllers/
│   ├── services/
│   ├── queries/
│   └── dto/
│
├── analytics/
│   ├── controllers/
│   ├── services/
│   └── queries/
│
├── realtime/
│   └── streaming/
│
├── cache/
│   └── redis/
│
├── clickhouse/
│   ├── client/
│   ├── repositories/
│   └── queries/
│
└── common/
    ├── guards/
    ├── interceptors/
    ├── filters/
    └── utilities/
```

The exact module structure can evolve as the Universal Log Intake architecture develops.

---

#  End-to-End Flow

## Application → Dashboard

```text
┌──────────────┐
│ Application  │
└──────┬───────┘
       │
       │ Log + API Key
       ▼
┌──────────────┐
│   NestJS     │
│   Ingestion  │
└──────┬───────┘
       │
       │ Publish
       ▼
┌──────────────┐
│ NATS         │
│ JetStream    │
└──────┬───────┘
       │
       │ Consume
       ▼
┌──────────────┐
│ Log Consumer │
└──────┬───────┘
       │
       ├───────────────► Live Stream
       │                       │
       │                       ▼
       │                 ┌───────────┐
       │                 │ Dashboard │
       │                 └───────────┘
       │
       ▼
┌──────────────┐
│  ClickHouse  │
│ Log Storage  │
└──────┬───────┘
       │
       │ Query
       ▼
┌──────────────┐
│ NestJS Query │
│     API      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Dashboard   │
└──────────────┘
```

---

#  Future: Universal Log Intake

The current NestJS ingestion API is designed to evolve into the **Universal Log Intake** layer of One Log.

Instead of assuming that logs originate from the TypeScript SDK, the backend will eventually accept multiple sources:

```text
                    ┌─────────────────┐
                    │ TypeScript SDK  │
                    ├─────────────────┤
                    │ Python SDK      │
                    ├─────────────────┤
                    │ Go SDK          │
                    ├─────────────────┤
                    │ Java SDK        │
                    ├─────────────────┤
                    │ HTTP            │
                    ├─────────────────┤
                    │ Webhooks        │
                    ├─────────────────┤
                    │ Docker          │
                    ├─────────────────┤
                    │ Kubernetes      │
                    ├─────────────────┤
                    │ Syslog          │
                    └────────┬────────┘
                             │
                             ▼
                 ┌──────────────────────┐
                 │ Universal Log Intake │
                 │                      │
                 │ Normalize            │
                 │ Validate             │
                 │ Enrich               │
                 │ Identify Source      │
                 │ Map Schema           │
                 └──────────┬───────────┘
                            │
                            ▼
                     NATS JetStream
                            │
                            ▼
                       ClickHouse
                            │
                            ▼
                    One Log Dashboard
```

The important architectural distinction is:

> **Sources may produce completely different log formats, but One Log should normalize them into a common internal representation before downstream processing.**

---

#  Technology Stack

| Component | Technology |
|---|---|
| Backend | NestJS |
| Language | TypeScript |
| Streaming | NATS JetStream |
| Analytical Database | ClickHouse |
| Cache / Runtime State | Redis |
| Authentication | API Keys |
| Live Streaming | NestJS real-time streaming layer |
| Dashboard | Next.js |
| Deployment | Docker / Self-hosted |

---



# ⚙️ Infrastructure

The backend depends on:

```text
NestJS
   │
   ├── NATS JetStream
   ├── ClickHouse
   └── Redis
```

For local development, these services can be started using Docker Compose.

Example:

```bash
docker compose up -d
```

---

# 🔐 Environment Configuration

Example environment variables:

```env
PORT=3000

NATS_URL=nats://localhost:4222

CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DATABASE=one_log
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

REDIS_URL=redis://localhost:6379
```

API-key and authentication configuration should be provided through environment variables or a secure secret-management system.

---

# 🎯 Backend Responsibilities

The NestJS service sits at the center of One Log:

```text
                 ONE LOG BACKEND

 ┌───────────────────────────────────────────┐
 │                                           │
 │              API Keys / Auth              │
 │                     │                     │
 │                     ▼                     │
 │              Log Ingestion                │
 │                     │                     │
 │                     ▼                     │
 │               NATS JetStream              │
 │                     │                     │
 │              ┌──────┴──────┐              │
 │              ▼             ▼              │
 │          Processing     Live Stream        │
 │              │             │              │
 │              ▼             ▼              │
 │         ClickHouse     Dashboard          │
 │              │                            │
 │              ▼                            │
 │          Analytics                        │
 │                                           │
 │              Redis                         │
 │       Cache / Runtime State               │
 │                                           │
 └───────────────────────────────────────────┘
```

---

# 🗺️ Roadmap

### Phase 1 — Core Logging Infrastructure

- [x] API key generation
- [x] API key authentication
- [x] NestJS backend
- [x] Log ingestion
- [x] NATS JetStream integration
- [x] ClickHouse integration
- [x] Basic log storage

### Phase 2 — Monitoring & Analytics

- [x] Live log streaming
- [x] Log querying
- [x] ClickHouse analytics
- [x] Dashboard integration
- [ ] Advanced filtering
- [ ] Query optimization
- [ ] Redis caching strategy
- [ ] Log aggregation

### Phase 3 — Universal Log Intake

- [ ] Universal ingestion endpoint
- [ ] Source detection
- [ ] Log normalization
- [ ] Schema mapping
- [ ] Metadata enrichment
- [ ] Multiple log formats
- [ ] HTTP/webhook ingestion
- [ ] Docker log ingestion
- [ ] Kubernetes log ingestion
- [ ] Syslog ingestion

### Phase 4 — Intelligent Log Processing

- [ ] Automatic log classification
- [ ] Intelligent parsing
- [ ] Error grouping
- [ ] Pattern detection
- [ ] Anomaly detection
- [ ] Intelligent analytics

---

#  One Log Ecosystem

The backend is one part of the larger One Log platform.

```text
                    ONE LOG

 ┌──────────────────────────────────────────┐
 │                                          │
 │       Applications / Infrastructure     │
 │                    │                     │
 │                    ▼                     │
 │          Universal Log Intake            │
 │                    │                     │
 │                    ▼                     │
 │              NATS JetStream              │
 │                    │                     │
 │                    ▼                     │
 │               ClickHouse                │
 │                    │                     │
 │                    ▼                     │
 │             One Log Dashboard             │
 │                                          │
 └──────────────────────────────────────────┘
```

### Components

**One Log SDK**

Application-side client used to send logs.

**One Log Backend**

The NestJS service responsible for authentication, ingestion, streaming, storage, querying, and analytics.

**One Log Dashboard**

The interface for API-key management, live monitoring, log exploration, and analytics.

**Universal Log Intake**

The future ingestion layer that allows One Log to accept logs from virtually any source.

---

# Vision

One Log is being built around a simple idea:

> **Any source. Any log. One place to monitor and query them.**

The NestJS backend is the core processing layer that makes that possible.