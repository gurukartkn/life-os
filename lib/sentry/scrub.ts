import type { Event } from "@sentry/nextjs";

// ADR-008: what an error report may contain. This is an allowlist — the scrubbed
// event is built from scratch out of the few fields listed here, so anything the
// SDK adds later (request bodies, cookies, user, breadcrumbs, extra data, local
// variables, …) is dropped by default rather than needing to be blocked by name.

const MAX_TEXT_LENGTH = 300;
const ALLOWED_CONTEXTS = ["browser", "os", "runtime"] as const;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Free text can't be verified, so it is reduced: Postgres "Key (col)=(value)" details,
// email addresses, JWTs and anything inside quotes are masked, and it is truncated.
export function sanitizeText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value
    .replace(/Key \([^)]*\)=\([^)]*\)/gi, "Key (…)=(…)")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .replace(/(["'`])(?:(?!\1).)+\1/g, "$1…$1")
    .slice(0, MAX_TEXT_LENGTH);
}

// Path only: no query string, no fragment, and row ids replaced so routes group together.
export function sanitizeUrl(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  let clean = url;
  try {
    const parsed = new URL(url);
    clean = `${parsed.origin}${parsed.pathname}`;
  } catch {
    clean = url.split(/[?#]/)[0];
  }
  return clean.replace(UUID, ":id");
}

function definedOnly<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

type Exception = NonNullable<NonNullable<Event["exception"]>["values"]>[number];

function scrubException(exception: Exception): Exception {
  const frames = exception.stacktrace?.frames?.map((frame) =>
    definedOnly({
      filename: frame.filename,
      function: frame.function,
      module: frame.module,
      lineno: frame.lineno,
      colno: frame.colno,
      in_app: frame.in_app,
    })
  );

  return definedOnly({
    type: exception.type,
    value: sanitizeText(exception.value),
    mechanism: exception.mechanism
      ? definedOnly({ type: exception.mechanism.type, handled: exception.mechanism.handled })
      : undefined,
    stacktrace: frames ? { frames } : undefined,
  }) as Exception;
}

export function scrubEvent<T extends Event>(event: T): T {
  const contexts = event.contexts
    ? Object.fromEntries(
        ALLOWED_CONTEXTS.filter((key) => event.contexts?.[key] !== undefined).map((key) => [
          key,
          event.contexts?.[key],
        ])
      )
    : undefined;

  const scrubbed: Event = definedOnly({
    event_id: event.event_id,
    timestamp: event.timestamp,
    type: event.type,
    level: event.level,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    sdk: event.sdk,
    transaction: sanitizeUrl(event.transaction),
    message: sanitizeText(event.message),
    exception: event.exception
      ? { values: event.exception.values?.map(scrubException) }
      : undefined,
    request: event.request
      ? definedOnly({ url: sanitizeUrl(event.request.url), method: event.request.method })
      : undefined,
    contexts: contexts && Object.keys(contexts).length > 0 ? contexts : undefined,
  });

  return scrubbed as T;
}
