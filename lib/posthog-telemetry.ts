export function capturePostHogSafely(
  capture: () => void,
  reportError: (error: unknown) => void = (error) => {
    console.error("Failed to capture telemetry in PostHog", error);
  },
) {
  try {
    capture();
  } catch (error) {
    reportError(error);
  }
}

export function redactPostHogError(error: unknown, errorCode: string) {
  return {
    error: new Error(errorCode),
    properties: {
      error_code: errorCode,
      error_kind: error instanceof Error ? "error" : "unknown",
    },
  } as const;
}
