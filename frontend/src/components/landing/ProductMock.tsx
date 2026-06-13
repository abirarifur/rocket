'use client';

import { motion } from 'framer-motion';

/** A stylised mock of the Rocket request builder, for the hero preview. */
export function ProductMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-primary/30 to-transparent blur-sm" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-background/60 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-destructive/70" />
          <span className="h-3 w-3 rounded-full bg-[hsl(43_96%_56%)]" />
          <span className="h-3 w-3 rounded-full bg-success/70" />
          <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Rocket</span>
            <span>/ Payments API / Create charge</span>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_280px]">
          {/* request + response */}
          <div className="p-4">
            {/* URL bar */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5">
              <span className="rounded-md bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                POST
              </span>
              <code className="flex-1 truncate text-sm">
                <span className="text-primary">{'{{baseUrl}}'}</span>
                <span className="text-foreground">/v1/charges</span>
              </code>
              <motion.span
                initial={{ scale: 1 }}
                animate={{ scale: [1, 0.92, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                Send
              </motion.span>
            </div>

            {/* tabs */}
            <div className="mt-3 flex gap-4 border-b border-border text-xs text-muted-foreground">
              {['Body', 'Headers', 'Auth', 'Tests'].map((t, i) => (
                <span
                  key={t}
                  className={`-mb-px border-b-2 pb-2 ${
                    i === 0 ? 'border-primary font-medium text-foreground' : 'border-transparent'
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* body */}
            <pre className="mt-3 overflow-hidden rounded-lg bg-background p-3 text-xs leading-relaxed">
              <code>
                <span className="text-muted-foreground">{'{'}</span>
                {'\n  '}
                <span className="text-primary">"amount"</span>
                <span className="text-muted-foreground">: </span>
                <span className="text-success">2000</span>
                <span className="text-muted-foreground">,</span>
                {'\n  '}
                <span className="text-primary">"currency"</span>
                <span className="text-muted-foreground">: </span>
                <span className="text-[hsl(28_90%_60%)]">"usd"</span>
                <span className="text-muted-foreground">,</span>
                {'\n  '}
                <span className="text-primary">"source"</span>
                <span className="text-muted-foreground">: </span>
                <span className="text-[hsl(28_90%_60%)]">"tok_visa"</span>
                {'\n'}
                <span className="text-muted-foreground">{'}'}</span>
              </code>
            </pre>
          </div>

          {/* response */}
          <div className="border-t border-border bg-background/40 p-4 md:border-l md:border-t-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-success">200 OK</span>
              <span className="text-muted-foreground">142 ms · 1.2 KB</span>
            </div>
            <pre className="mt-3 overflow-hidden text-[11px] leading-relaxed text-muted-foreground">
              <code>
                {'{\n'}
                {'  "id": "ch_3Nf...",\n'}
                {'  "status": "succeeded",\n'}
                {'  "amount": 2000,\n'}
                {'  "paid": true\n'}
                {'}'}
              </code>
            </pre>
            <div className="mt-4 space-y-2">
              {['Tests passed', '3 assertions'].map((t) => (
                <div key={t} className="flex items-center gap-2 text-[11px] text-foreground">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-success/15 text-success">
                    ✓
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
