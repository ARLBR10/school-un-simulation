import { describe, expect, test } from "bun:test";

import {
  capturePostHogAsyncSafely,
  capturePostHogSafely,
  redactPostHogError,
} from "../lib/posthog-telemetry";

describe("capturePostHogSafely", () => {
  test("does not let telemetry failures escape into the form flow", () => {
    const telemetryError = new Error("PostHog unavailable");
    const reportedErrors: unknown[] = [];

    expect(() =>
      capturePostHogSafely(
        () => {
          throw telemetryError;
        },
        (error) => reportedErrors.push(error),
      ),
    ).not.toThrow();
    expect(reportedErrors).toEqual([telemetryError]);
  });

  test("does not expose raw error messages to PostHog", () => {
    const redacted = redactPostHogError(
      new Error("secret submitted answer"),
      "form_submission_failed",
    );

    expect(redacted.error.message).toBe("form_submission_failed");
    expect(JSON.stringify(redacted)).not.toContain("secret submitted answer");
  });

  test("does not let async PostHog initialization failures escape", async () => {
    const telemetryError = new Error("PostHog configuration unavailable");
    const reportedErrors: unknown[] = [];

    await expect(
      capturePostHogAsyncSafely(
        async () => {
          throw telemetryError;
        },
        (error) => reportedErrors.push(error),
      ),
    ).resolves.toBeUndefined();
    expect(reportedErrors).toEqual([telemetryError]);
  });
});
