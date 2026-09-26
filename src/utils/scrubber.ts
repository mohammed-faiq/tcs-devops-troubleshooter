/**
 * Data privacy scrubber to mask sensitive IP addresses, passwords,
 * auth tokens, and connection strings prior to transmission or display.
 */
export function scrubSensitiveData(rawText: string): { scrubbed: string; count: number } {
  let count = 0;
  let text = rawText;

  // Mask Bearer tokens, JWTs, api keys
  text = text.replace(/(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, (_match, prefix) => {
    count++;
    return `${prefix}[REDACTED_JWT_TOKEN]`;
  });

  text = text.replace(/((?:api[_-]?key|secret|token|password|passwd|auth)\s*[:=]\s*["']?)([^"' \s\n\r]{4,})["']?/gi, (_match, prefix) => {
    count++;
    return `${prefix}[REDACTED_SECRET]`;
  });

  // Mask database connection strings with passwords (e.g. postgres://user:pass@host:5432/db)
  text = text.replace(/([a-z]+:\/\/[^:\s]+:)([^@\s]+)(@[^\s]+)/gi, (_match, protoUser, _pass, host) => {
    count++;
    return `${protoUser}[REDACTED_PASSWORD]${host}`;
  });

  // Mask private and public IPv4 addresses (leaving localhost / loopback 127.0.0.1 or masking to synthetic 10.x / 192.168.x)
  text = text.replace(/\b(?!127\.0\.0\.1)(?!0\.0\.0\.0)(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, (match) => {
    count++;
    const parts = match.split('.');
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  });

  return { scrubbed: text, count };
}
