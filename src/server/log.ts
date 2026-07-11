type LogFields = Record<string, string | number | boolean | null | undefined>;

function hashId(value: string): string {
  // Short non-cryptographic fingerprint for logs (not for security).
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

export function logEvent(event: string, fields: LogFields = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.log(JSON.stringify(payload));
}

export function logLearnerRef(learnerId: string): string {
  return hashId(learnerId);
}
