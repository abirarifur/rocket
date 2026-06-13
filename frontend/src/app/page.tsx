import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { LogoStrip } from '@/components/landing/LogoStrip';
import { Features } from '@/components/landing/Features';
import { Platform } from '@/components/landing/Platform';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Stats } from '@/components/landing/Stats';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LandingNav />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <Platform />
        <HowItWorks />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
