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
          <span className="h-2.5 w-2.5 rounded-sm bg-mark" aria-hidden="true" />
          <span className="font-serif text-xl text-ink">ThesisPartner</span>
        </Link>
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <h1 className="font-serif text-2xl text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{intro}</p>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
