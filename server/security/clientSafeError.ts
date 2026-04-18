/** Whether the app is running in production (generic errors only to clients). */
export function isProductionNodeEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * JSON body for API errors: in production omit internal `details` / paths.
 * Pass `devExtras` for non-production diagnostics only.
 */
export function clientErrorJson(
  publicMessage: string,
  err: unknown,
  devExtras?: Record<string, unknown>,
): Record<string, unknown> {
  if (isProductionNodeEnv()) {
    return { error: publicMessage };
  }
  const details = err instanceof Error ? err.message : String(err);
  return {
    error: publicMessage,
    details,
    ...devExtras,
  };
}
