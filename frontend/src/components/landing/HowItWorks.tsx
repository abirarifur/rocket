'use client';

import { motion } from 'framer-motion';
import { Reveal, Stagger, staggerItem } from './Reveal';

const STEPS = [
  {
    n: '01',
    title: 'Create a workspace',
    body: 'Spin up a team workspace and invite collaborators. Everyone works in the same shared space, live.',
  },
  {
    n: '02',
    title: 'Build & organise requests',
    body: 'Add requests, group them into collections, and define environment variables for each stage.',
  },
  {
    n: '03',
    title: 'Send through the proxy',
    body: 'Rocket routes every request through a secure server-side proxy and captures the full response.',
  },
  {
    n: '04',
    title: 'Run, test & document',
    body: 'Run collections with assertions, then publish auto-generated docs and code snippets for your team.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold text-primary">How it works</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          From idea to tested API in four steps
        </h2>
      </Reveal>

      <Stagger className="relative mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <motion.div
            key={s.n}
            variants={staggerItem}
            className="relative rounded-2xl border border-border bg-card p-6"
          >
            <span className="text-4xl font-bold text-primary/25">{s.n}</span>
            <h3 className="mt-3 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </motion.div>
        ))}
      </Stagger>
    </section>
  );
}
