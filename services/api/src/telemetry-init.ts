import { startTelemetry } from './telemetry';

// Imported first by main.ts, so instrumentation is in place before Nest and Express load.
startTelemetry();
