'use client';

import { animate, motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: 40, suffix: '%', label: 'less time wired into glue tooling' },
  { value: 6, suffix: '+', label: 'protocols & import formats supported' },
  { value: 100, suffix: 'ms', label: 'median proxied response time' },
  { value: 0, prefix: '$', label: 'to start — free forever for individuals' },
];

function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-16 sm:px-8 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="text-center"
          >
            <div className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
