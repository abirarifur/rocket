'use client';

const ITEMS = [
  'REST',
  'GraphQL',
  'WebSocket',
  'gRPC',
  'OpenAPI',
  'cURL import',
  'Postman import',
  'OAuth 2.0',
  'JWT',
  'Webhooks',
];

export function LogoStrip() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <section className="border-y border-border bg-card/30 py-8">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Speaks every protocol your team works with
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
          {row.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="text-lg font-semibold text-muted-foreground/70"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
