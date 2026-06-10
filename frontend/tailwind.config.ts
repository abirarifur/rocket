import type { Config } from 'tailwindcss';

// shadcn tokens are namespaced with --sc-* so they don't collide with the
// project's legacy CSS variables (--bg, --panel, --border, --accent, …) that
// existing inline-styled components still use. Both systems coexist.
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--sc-border))',
        input: 'hsl(var(--sc-input))',
        ring: 'hsl(var(--sc-ring))',
        background: 'hsl(var(--sc-background))',
        foreground: 'hsl(var(--sc-foreground))',
        primary: { DEFAULT: 'hsl(var(--sc-primary))', foreground: 'hsl(var(--sc-primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--sc-secondary))', foreground: 'hsl(var(--sc-secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--sc-destructive))', foreground: 'hsl(var(--sc-destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--sc-muted))', foreground: 'hsl(var(--sc-muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--sc-accent))', foreground: 'hsl(var(--sc-accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--sc-popover))', foreground: 'hsl(var(--sc-popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--sc-card))', foreground: 'hsl(var(--sc-card-foreground))' },
        success: 'hsl(var(--sc-success))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: { 'accordion-down': 'accordion-down 0.2s ease-out', 'accordion-up': 'accordion-up 0.2s ease-out' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
