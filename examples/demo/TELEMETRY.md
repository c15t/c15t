# OpenTelemetry + Axiom Setup

This demo includes OpenTelemetry instrumentation that sends traces and metrics to [Axiom](https://axiom.co).

## Quick Start

1. **Create Axiom Datasets**

   In your Axiom dashboard, create two datasets:
   - `c15t-traces` - for trace data
   - `c15t-metrics` - for metrics data

2. **Get an API Token**

   Create an API token in Axiom with ingestion permissions.

3. **Set Environment Variables**

   Create a `.env.local` file:

   ```bash
   AXIOM_API_TOKEN=your-api-token-here
   AXIOM_DATASET=c15t-traces
   AXIOM_DATASET_METRICS=c15t-metrics
   ```

4. **Run the App**

   ```bash
   npm install -g portless
   bun install
   bun run dev
   ```

   The demo now runs through Portless and will open on a stable named local URL such as `https://example-demo.localhost`.

5. **View Telemetry in Axiom**

   - Open your Axiom dashboard
   - Navigate to the `c15t-traces` dataset to see traces
   - Navigate to the `c15t-metrics` dataset to see metrics

## What Gets Tracked

### Traces

- HTTP request spans (method, path, status, duration)
- Database operations (find, create, update)
- Cache operations (hits, misses)
- GVL fetches

### Metrics

| Metric | Description |
|--------|-------------|
| `c15t.consent.created` | Consent submissions (with type, status, jurisdiction, country, region) |
| `c15t.consent.accepted` | Consents accepted |
| `c15t.consent.rejected` | Consents rejected |
| `c15t.subject.created` | New subjects created |
| `c15t.subject.linked` | Subjects linked to external ID |
| `c15t.init.count` | Init endpoint calls |
| `c15t.http.request.duration` | Request latency histogram |
| `c15t.http.request.count` | Total requests |
| `c15t.http.error.count` | Error count |
| `c15t.cache.hit` | Cache hits (by layer) |
| `c15t.cache.miss` | Cache misses (by layer) |
| `c15t.gvl.fetch.duration` | GVL fetch latency |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App                               │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │ instrumentation.ts │     │  c15t Backend                    │  │
│  │                    │     │                                   │  │
│  │  NodeSDK          │────▶│  telemetry: {                     │  │
│  │  - TraceExporter  │     │    enabled: true,                 │  │
│  │  - MetricExporter │     │    tracer: getTracer(),           │  │
│  │                    │     │    meter: getMeter(),             │  │
│  └──────────────────┘     │  }                                 │  │
│           │                 └──────────────────────────────────┘  │
│           │                                                       │
└───────────┼───────────────────────────────────────────────────────┘
            │
            ▼ OTLP Protocol
┌───────────────────────────────────────────────────────────────────┐
│                         Axiom                                      │
│                                                                    │
│  ┌─────────────────┐     ┌─────────────────────────────────────┐  │
│  │ c15t-traces     │     │ c15t-metrics                        │  │
│  │                 │     │                                      │  │
│  │ - HTTP spans    │     │ - Consent metrics                   │  │
│  │ - DB spans      │     │ - HTTP metrics                      │  │
│  │ - Cache spans   │     │ - Cache metrics                     │  │
│  └─────────────────┘     └─────────────────────────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

## Files

- `instrumentation.ts` - Next.js instrumentation file that sets up OpenTelemetry SDK
- `lib/telemetry.ts` - Utility functions to get tracer/meter for c15t
- `app/api/self-host/[...all]/route.ts` - Uses `getTelemetryConfig()` to enable telemetry

## Disabling Telemetry

Simply don't set the `AXIOM_API_TOKEN` environment variable. The app will run without telemetry.

## Using a Different Backend

You can replace Axiom with any OTLP-compatible backend by changing the URLs in `instrumentation.ts`:

```typescript
const traceExporter = new OTLPTraceExporter({
  url: 'https://your-backend.com/v1/traces',
  headers: {
    // Your auth headers
  },
});
```

## Troubleshooting

### No data in Axiom?

1. Check that `AXIOM_API_TOKEN` is set
2. Check the console for `[OTEL]` logs
3. Verify your API token has ingestion permissions
4. Ensure the datasets exist in Axiom

### Edge Runtime

OpenTelemetry NodeSDK doesn't work in Edge runtime. The instrumentation automatically skips initialization when `NEXT_RUNTIME === 'edge'`.
