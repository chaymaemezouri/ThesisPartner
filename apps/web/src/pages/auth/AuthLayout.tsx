import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrandLogo } from '../../components/BrandLogo';
import { authNavigation } from './auth-navigation';

export function AuthLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const [params] = useSearchParams();
  const { loginUrl } = authNavigation(params);
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <Link to={loginUrl} className="mb-6 flex justify-center" aria-label="EzzInnov Thesis Flow">
          <BrandLogo className="h-36 w-auto max-w-[16rem]" />
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
