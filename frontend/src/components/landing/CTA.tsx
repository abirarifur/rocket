'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to build APIs the collaborative way?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Create your workspace in seconds. Invite your team, send your first request,
              and never lose track of an endpoint again.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Get started free
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
