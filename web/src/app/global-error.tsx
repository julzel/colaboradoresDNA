"use client";

import { Button } from "@/components/ui/button/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="error-page">
          <p className="eyebrow">Something went wrong</p>
          <h1>We could not load this page.</h1>
          <p>Please try again. If the problem continues, come back in a few minutes.</p>
          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
