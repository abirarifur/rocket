import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { StatusPill } from './StatusPill';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'Platform', href: '#platform' },
      { label: 'Live demo', href: '/app' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs/getting-started' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Sign in', href: '/login' },
      { label: 'Get started', href: '/register' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#platform' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Rocket size={18} />
            </span>
            Rocket
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The collaborative, self-hostable API platform for building, testing, and
            documenting APIs together.
          </p>
          <div className="mt-5">
            <StatusPill />
          </div>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} Rocket. A Postman-inspired API platform.</p>
          <p>Built with Next.js · self-hostable · open by design</p>
        </div>
      </div>
    </footer>
  );
}
