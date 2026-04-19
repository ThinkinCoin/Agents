export function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      plugin: "starplast-ops",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}
