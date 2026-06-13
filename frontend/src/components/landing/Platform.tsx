'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

const POINTS = [
  'A Postman-inspired workspace, open and self-hostable',
  'Requests run through a secure server-side proxy — no CORS headaches',
  'A dedicated runner executes collections and assertions at scale',
  'Multi-tenant teams, workspaces, and role-based access built in',
];

const NODES = [
  { label: 'Web app', sub: 'Next.js UI', tone: 'primary' },
  { label: 'API', sub: 'auth · data · realtime', tone: 'card' },
  { label: 'Proxy', sub: 'sends your requests', tone: 'card' },
  { label: 'Runner', sub: 'runs collections', tone: 'card' },
];

export function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 border-y border-border bg-card/30">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <span className="text-sm font-semibold text-primary">What is Rocket?</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            The open API platform your team actually owns
          </h2>
          <p className="mt-4 text-muted-foreground">
            Rocket brings request building, collections, environments, collaboration, and
            documentation into a single workspace — backed by a clean service architecture
            you can run anywhere.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check size={13} />
                </span>
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Explore the platform
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        {/* architecture diagram */}
        <Reveal delay={0.1}>
          <div className="relative rounded-2xl border border-border bg-background p-6">
            <div className="landing-grid pointer-events-none absolute inset-0 rounded-2xl opacity-60" />
            <div className="relative space-y-3">
              {NODES.map((n, i) => (
                <div key={n.label}>
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      n.tone === 'primary'
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <span className="font-semibold">{n.label}</span>
                    <span className="text-xs text-muted-foreground">{n.sub}</span>
                  </motion.div>
                  {i < NODES.length - 1 && (
                    <div className="ml-6 h-4 w-px bg-border" aria-hidden />
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                <span>Postgres · Redis · S3</span>
                <span>persistence layer</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
