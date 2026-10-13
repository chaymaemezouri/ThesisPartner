import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/connexion" className="mb-6 flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white shadow-[0_8px_18px_rgba(36,87,167,0.18)]"
            aria-hidden="true"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">ThesisPartner</span>
        </Link>
        <section className="rounded-md border border-line bg-surface p-5 shadow-card">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{intro}</p>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
