import { useState } from 'react';
import { Input, Select } from '@thesispartner/ui';
import { adminInvoiceListSchema, invoiceDownloadSchema } from '@thesispartner/validation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { AdminPageHeader, AdminPanel, AdminState } from './AdminUi';

export function AdminInvoicesPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [environment, setEnvironment] = useState('');

  const invoices = useQuery({
    queryKey: ['admin', 'invoices', search, environment],
    queryFn: () =>
      apiGet(
        `/api/v1/admin/invoices?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}${environment ? `&environment=${environment}` : ''}`,
        adminInvoiceListSchema,
      ),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('admin.invoices.title')} subtitle={t('admin.invoices.subtitle')} />
      <div className="flex flex-wrap gap-3">
        <Input id="inv-search" label={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          id="inv-env"
          label={t('admin.payments.environment')}
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
        >
          <option value="">{t('common.all')}</option>
          <option value="TEST">TEST</option>
          <option value="LIVE">LIVE</option>
        </Select>
      </div>
      <AdminState loading={invoices.isLoading} error={invoices.error}>
        <AdminPanel title={t('admin.invoices.documents')}>
          <ul className="space-y-2 text-sm">
            {invoices.data?.invoices.map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
                <span>
                  {row.invoiceNumber} · {row.email} · {(row.totalMinor / 100).toFixed(2)} MAD
                  {row.specimen ? ` · ${t('billing.specimen')}` : ''}
                </span>
                {row.downloadable ? (
                  <button
                    type="button"
                    className="text-brand hover:underline"
                    onClick={async () => {
                      const signed = await apiGet(
                        `/api/v1/admin/invoices/${row.id}/download`,
                        invoiceDownloadSchema,
                      );
                      window.open(signed.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {t('billing.download')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </AdminPanel>
      </AdminState>
    </div>
  );
}
