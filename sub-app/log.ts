function ts(): string {
  return new Date().toISOString();
}

export function log(msg: string, extra?: Record<string, unknown>): void {
  if (extra && Object.keys(extra).length > 0) {
    console.log(`${ts()} ${msg}`, extra);
  } else {
    console.log(`${ts()} ${msg}`);
  }
}

export function logError(msg: string, err?: unknown): void {
  if (err !== undefined) console.error(`${ts()} ${msg}`, err);
  else console.error(`${ts()} ${msg}`);
}
