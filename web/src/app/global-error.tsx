"use client";

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
          <button className="button button--primary" onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
