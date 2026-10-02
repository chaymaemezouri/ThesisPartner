import { Link } from 'react-router-dom';
import { useT } from '../i18n/LocaleContext';

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-2xl text-ink">{t('notFound.title')}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{t('notFound.body')}</p>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-brand">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
