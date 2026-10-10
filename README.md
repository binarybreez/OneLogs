<p align="center">
  <img
    alt="One Log SDK"
    src="https://shieldcn.dev/header/graph.svg?title=One+Log+SDK&subtitle=A+Lightweight+Monitoring+Library&mode=dark&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1451187580459-43490279c0fa%3Fw%3D1600%26q%3D70%26fit%3Dcrop%26fm%3Djpg"
  />
</p>

<p align="center">
  <strong>A lightweight, developer-friendly SDK for application logging and real-time monitoring.</strong>
</p>

<p align="center">
  <img src="https://shieldcn.dev/badge/TypeScript.svg?variant=branded&brand=typescript" alt="TypeScript" />
  <img src="https://shieldcn.dev/badge/Next.js.svg?variant=branded&brand=nextdotjs" alt="Next.js" />
  <img src="https://shieldcn.dev/badge/npm.svg?variant=branded&brand=npm" alt="npm" />
  <img src="https://shieldcn.dev/badge/Docker.svg?variant=branded&brand=docker" alt="Docker" />
  <img src="https://shieldcn.dev/flag/in.svg" alt="Built in India" />
</p>

---

## Overview

**One Log SDK** is a lightweight application monitoring and logging library designed to make it easier for developers to collect, process, and observe application logs in real time.

Instead of manually configuring multiple logging mechanisms across an application, One Log provides a unified interface for capturing application events and forwarding structured log data to a monitoring system.

### Why One Log?

Modern applications generate logs from many different sources:

- Application errors
- API requests
- Database operations
- Authentication events
- Background jobs
- Third-party integrations
- Infrastructure services
- User actions

Managing these logs consistently can become difficult as an application grows.

**One Log aims to provide a single, simple interface for application observability.**

---

##  Features

-  **Lightweight** — Minimal overhead for your application
-  **Structured Logging** — Store logs in a consistent, machine-readable format
-  **Real-Time Monitoring** — Stream application events as they occur
-  **Log Levels** — Support for `debug`, `info`, `warn`, and `error`
-  **Framework Friendly** — Designed to integrate with modern applications
-  **Developer Focused** — Simple APIs with sensible defaults
-  **Configurable** — Control what information is collected and where it is sent
-  **Easy Integration** — Install and start logging with minimal configuration
-  **Container Ready** — Designed to work naturally with Dockerized applications

---

##  Architecture

```text
                    ANY LOG SOURCE
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
     Apps              Infra          Log Systems
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                UNIVERSAL LOG INTAKE
                          │
                          ▼
                 NORMALIZATION
                          │
                          ▼
                    ENRICHMENT
                          │
                          ▼
                    NATS STREAM
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         LIVE MONITORING          PROCESSING
              │                       │
              │                       ▼
              │                  CLICKHOUSE
              │                       │
              └───────────┬───────────┘
                          ▼
                   QUERY & ANALYSIS
                          │
                          ▼
                 DEVELOPER DASHBOARD
```
---

##  Installation

### npm

```bash
npm install one-log-sdk
```

### pnpm

```bash
pnpm add one-log-sdk
```

### Bun

```bash
bun add one-log-sdk
```

---

##  Quick Start

```typescript
import { OneLog } from "one-log-sdk";

const logger = new OneLog({
  service: "my-application",
  environment: "production",
});

logger.info("Application started");

logger.warn("High memory usage detected");

logger.error("Failed to process request");
```

---

##  Structured Logging

One Log supports structured metadata so that logs contain useful context rather than just plain text.

```typescript
logger.info("User logged in", {
  userId: "user_123",
  method: "google",
});
```

Example output:

```json
{
  "level": "info",
  "message": "User logged in",
  "service": "my-application",
  "environment": "production",
  "userId": "user_123",
  "method": "google",
  "timestamp": "2026-10-05T10:00:00.000Z"
}
```

---

##  Log Levels

One Log provides standard log levels:

| Level | Purpose |
|---|---|
| `debug` | Detailed information useful during development |
| `info` | General application events |
| `warn` | Potential problems that do not stop execution |
| `error` | Errors and failures requiring attention |

Example:

```typescript
logger.debug("Cache lookup started");

logger.info("Payment completed");

logger.warn("API rate limit approaching");

logger.error("Payment processing failed");
```

---

## 🧠 Context-Aware Logging

Logs become significantly more useful when they contain application context.

```typescript
logger.info("Request completed", {
  requestId: "req_123",
  method: "GET",
  path: "/api/users",
  statusCode: 200,
  duration: 142,
});
```

This allows developers to search and analyze logs based on attributes such as:

- Request ID
- User ID
- Service
- Environment
- HTTP method
- Status code
- Execution time
- Custom metadata

---

##  Error Logging

Capture errors together with useful context.

```typescript
try {
  await processPayment();
} catch (error) {
  logger.error("Payment processing failed", {
    error,
    orderId: "order_123",
  });
}
```

The SDK can preserve useful error information such as:

```text
Error Message
Stack Trace
Error Type
Request Context
Custom Metadata
Timestamp
```

---

##  Environment Support

Configure logging behavior based on the environment.

```typescript
const logger = new OneLog({
  service: "payment-service",
  environment: process.env.NODE_ENV,
  level: process.env.NODE_ENV === "production"
    ? "info"
    : "debug",
});
```

Typical environments include:

```text
development
staging
production
```

---

##  Framework Integration

One Log is designed to be framework-agnostic while providing integrations for popular development environments.

Potential integrations include:

- Next.js
- Node.js
- Express
- Fastify
- NestJS
- Serverless functions
- Background workers
- Docker containers

Example with an API route:

```typescript
export async function GET() {
  logger.info("Fetching users");

  const users = await getUsers();

  logger.info("Users fetched", {
    count: users.length,
  });

  return Response.json(users);
}
```

---

##  Log Pipeline

One Log follows a simple processing pipeline:

```text
Application
     │
     ▼
Capture
     │
     ▼
Normalize
     │
     ▼
Enrich
     │
     ▼
Filter
     │
     ▼
Transport
     │
     ▼
Monitoring
```

This allows the SDK to remain lightweight while keeping log processing extensible.

---

##  Configuration

Example configuration:

```typescript
const logger = new OneLog({
  service: "my-service",
  environment: "production",

  level: "info",

  transport: {
    endpoint: process.env.ONE_LOG_ENDPOINT,
    apiKey: process.env.ONE_LOG_API_KEY,
  },
});
```

### Configuration Options

| Option | Description |
|---|---|
| `service` | Name of the application/service |
| `environment` | Runtime environment |
| `level` | Minimum log level |
| `transport` | Destination for processed logs |
| `metadata` | Default metadata attached to logs |

---

## 🔐 Security & Privacy

Logging systems can unintentionally capture sensitive information.

One Log is designed with configurable processing so applications can control what information is sent to the monitoring layer.

Recommended practices:

- Never log passwords
- Never log authentication tokens
- Avoid logging API keys
- Avoid storing unnecessary personal information
- Sanitize sensitive request data
- Configure appropriate retention policies

Example:

```typescript
logger.info("User authenticated", {
  userId: user.id,
  // password: ❌ never log this
  // accessToken: ❌ never log this
});
```

---

## 🐳 Docker

One Log is designed to work with containerized applications.

```yaml
services:
  app:
    build: .
    environment:
      ONE_LOG_ENDPOINT: ${ONE_LOG_ENDPOINT}
      ONE_LOG_API_KEY: ${ONE_LOG_API_KEY}
```

This allows the same logging configuration to be used across local development, staging, and production environments.

---

## 🗺️ Roadmap

One Log is being developed in phases, starting with a reliable log ingestion and storage pipeline and evolving toward a **Universal Log Processing and Monitoring Platform**.

### ✅ Phase 1 — Core Log Infrastructure

The foundation for receiving, streaming, and storing application logs is implemented.

- [x] API key generation and management
- [x] Application/service authentication
- [x] Log ingestion API
- [x] Real-time log streaming
- [x] NATS-based event streaming
- [x] NestJS backend service
- [x] ClickHouse OLAP database
- [x] Persistent log storage
- [x] Structured log storage architecture
- [x] Application-to-platform log pipeline

### 🚧 Phase 2 — Universal Log Intake & Live Monitoring

The next phase focuses on making One Log **source-agnostic**.

The goal is to allow logs from different applications, frameworks, infrastructure components, and logging systems to enter One Log through a **unified ingestion layer**, regardless of their original format or source.

#### Universal Log Intake

- [ ] Universal log ingestion endpoint
- [ ] Source-independent log ingestion
- [ ] Support for multiple log formats
- [ ] Automatic log format detection
- [ ] Log normalization
- [ ] Schema mapping
- [ ] Metadata enrichment
- [ ] Source identification
- [ ] Timestamp normalization
- [ ] Log-level normalization
- [ ] Request/trace correlation
- [ ] Configurable ingestion pipelines

Potential sources include:

```text
Applications
    │
    ├── Node.js
    ├── Python
    ├── Java
    ├── Go
    └── Other applications
          │
          ▼
Frameworks & Services
    │
    ├── Next.js
    ├── NestJS
    ├── Express
    ├── FastAPI
    └── Other services
          │
          ▼
Infrastructure
    │
    ├── Docker
    ├── Kubernetes
    ├── Nginx
    ├── System logs
    └── Cloud services
          │
          ▼
Existing Logging Systems
    │
    ├── JSON logs
    ├── Syslog
    ├── Webhooks
    ├── HTTP collectors
    └── Other log sources
          │
          ▼
┌──────────────────────────┐
│   Universal Log Intake   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Normalize & Enrich Logs  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       NATS Stream        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       ClickHouse         │
└──────────────────────────┘
```

#### Live Monitoring

- [ ] Real-time log dashboard
- [ ] Live log streaming UI
- [ ] Real-time log filtering
- [ ] Search logs as they arrive
- [ ] Service/application filtering
- [ ] Environment filtering
- [ ] Log-level filtering
- [ ] Time-range filtering
- [ ] Auto-refresh/live mode
- [ ] Log detail inspection
- [ ] Structured metadata inspection

#### Log Querying

Introduce a powerful query layer on top of ClickHouse for analyzing stored and incoming logs.

- [ ] Searchable log explorer
- [ ] Query builder
- [ ] Advanced filtering
- [ ] Full-text search
- [ ] Field-based filtering
- [ ] Time-series queries
- [ ] Aggregations
- [ ] Group-by queries
- [ ] Sorting and pagination
- [ ] Saved queries
- [ ] Query history
- [ ] Query performance optimization

Example:

```text
service = "payment-service"
AND level = "error"
AND environment = "production"
AND timestamp > now() - 1h
```

The query layer will translate user queries into optimized ClickHouse queries where appropriate.

---

### 🔮 Phase 3 — Intelligent Log Processing

Once universal ingestion and monitoring are stable, One Log can evolve from simply **collecting logs** to understanding them.

- [ ] Automatic log classification
- [ ] Log pattern detection
- [ ] Duplicate log detection
- [ ] Error grouping
- [ ] Stack-trace parsing
- [ ] Automatic metadata extraction
- [ ] Anomaly detection
- [ ] Error-rate analysis
- [ ] Log-based metrics
- [ ] Intelligent correlation
- [ ] AI-assisted log analysis

---

### 🔮 Phase 4 — Observability

Expand beyond logs toward a broader observability platform.

- [ ] Metrics ingestion
- [ ] Distributed tracing
- [ ] Trace IDs
- [ ] Request correlation
- [ ] Service dependency mapping
- [ ] Performance monitoring
- [ ] Application health monitoring
- [ ] Service-level indicators
- [ ] Custom dashboards
- [ ] Alerting and notifications

---

### 🔮 Phase 5 — Developer & Operations Platform

Build a complete developer-facing monitoring experience.

- [ ] Custom dashboards
- [ ] Saved views
- [ ] Alert rules
- [ ] Email notifications
- [ ] Webhook integrations
- [ ] Slack/Discord integrations
- [ ] Team management
- [ ] Role-based access control
- [ ] Organization/project management
- [ ] Log retention policies
- [ ] Usage analytics
- [ ] SDK integrations
- [ ] CLI
- [ ] OpenTelemetry compatibility

---

## 🎯 Long-Term Vision

The long-term goal of One Log is to become a **Universal Log Processing and Monitoring Platform**.

Instead of requiring developers to adapt their applications to a specific logging system, One Log aims to accept logs from virtually any source, normalize them into a common representation, process them through a scalable streaming pipeline, store them efficiently, and provide a unified interface for real-time monitoring and querying.


**Vision:**  
> **One ingestion layer for logs from anywhere. One streaming pipeline. One storage layer. One interface for monitoring and querying everything.**