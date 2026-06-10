import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/** Centered card layout shared by the login/register pages (shadcn Card). */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="text-2xl font-bold">
            Rocket <span className="text-primary">🚀</span>
          </div>
          <CardTitle className="text-base font-normal text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
