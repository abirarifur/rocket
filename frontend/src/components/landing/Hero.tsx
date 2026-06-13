'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { ProductMock } from './ProductMock';

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36">
      {/* backdrop */}
      <div className="landing-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="landing-glow animate-float pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[680px] -translate-x-1/2" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.a
            href="#platform"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Real-time collaboration is here
            <ArrowRight size={12} />
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease }}
            className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Build, test, and ship
            <br />
            APIs <span className="text-gradient">faster, together</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
          >
            Rocket is the collaborative API platform for designing requests, running
            collections, managing environments, and documenting everything — in one
            real-time workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-transform hover:-translate-y-0.5"
            >
              Start building free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 text-sm font-semibold backdrop-blur transition-colors hover:bg-accent"
            >
              <Play size={15} className="text-primary" />
              Live demo
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-xs text-muted-foreground"
          >
            No credit card required · Free forever for individuals
          </motion.p>
        </div>

        {/* product preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <ProductMock />
        </motion.div>
      </div>
    </section>
  );
}
