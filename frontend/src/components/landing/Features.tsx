'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  FolderTree,
  Layers,
  Lock,
  PlayCircle,
  Send,
  Users,
  Webhook,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './Reveal';

const FEATURES = [
  {
    icon: Send,
    title: 'Request builder',
    body: 'Compose any REST request with params, headers, auth, and bodies. Inline {{variable}} highlighting shows resolved values as you type.',
  },
  {
    icon: FolderTree,
    title: 'Collections',
    body: 'Organise requests into shareable collections with folder-level auth, variables, and documentation that stays in sync.',
  },
  {
    icon: Layers,
    title: 'Environments',
    body: 'Switch between local, staging, and production with one click. Scoped variables resolve automatically across every request.',
  },
  {
    icon: PlayCircle,
    title: 'Collection runner',
    body: 'Run a whole collection, chain requests, and assert on responses with scripted tests and a clear pass/fail report.',
  },
  {
    icon: Users,
    title: 'Real-time collaboration',
    body: 'See teammates’ cursors and presence live. Comment, share, and edit the same workspace without stepping on each other.',
  },
  {
    icon: Webhook,
    title: 'WebSocket & live APIs',
    body: 'Connect to WebSocket endpoints, stream messages, and inspect frames alongside your regular HTTP traffic.',
  },
  {
    icon: FileText,
    title: 'Auto documentation',
    body: 'Every collection generates clean, browsable docs and ready-to-paste code snippets in your language of choice.',
  },
  {
    icon: Lock,
    title: 'Secure by default',
    body: 'Encrypted secrets, OAuth 2.0 flows, and team roles keep credentials safe across your whole organisation.',
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold text-primary">Everything in one place</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          One platform for the entire API lifecycle
        </h2>
        <p className="mt-4 text-muted-foreground">
          From the first request to production monitoring — Rocket replaces the patchwork
          of tools your team juggles today.
        </p>
      </Reveal>

      <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={staggerItem}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon size={20} />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </motion.div>
        ))}
      </Stagger>
    </section>
  );
}
