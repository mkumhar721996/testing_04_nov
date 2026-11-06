import { afterEach, describe, expect, it } from 'vitest';
import { startTelemetry } from './telemetry';

describe('startTelemetry', () => {
  afterEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  it('is a no-op when the endpoint is unset', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(startTelemetry()).toBeNull();
  });

  it('starts the SDK when the endpoint is set', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    const sdk = startTelemetry();
    expect(sdk).not.toBeNull();
    await sdk?.shutdown();
  });
});
