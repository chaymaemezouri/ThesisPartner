import { renderInvoicePdf } from './invoice-pdf';

describe('invoice pdf', () => {
  it('renders a specimen PDF without invented tax rates', () => {
    const pdf = renderInvoicePdf({
      invoiceNumber: 'TP-TEST-2026-000001',
      issueDateIso: '2026-10-26',
      specimen: true,
      kind: 'INVOICE',
      status: 'ISSUED',
      issuerName: 'Identite legale non configuree',
      issuerAddress: '—',
      issuerLegalId: '—',
      recipientName: 'Lea Bill',
      recipientEmail: 'lea@example.test',
      description: 'Abonnement Thesis Flow Pro (mensuel)',
      planCode: 'THESISPARTNER_PRO_MONTHLY',
      periodLabel: '2026-10-26 → 2026-11-25',
      amountMad: '199.00',
      taxLabel: 'Taxes (non configurees)',
      taxMad: '0.00',
      totalMad: '199.00',
      currency: 'MAD',
      paymentReference: 'mock_pay_1',
      environment: 'TEST',
    });
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('SPECIMEN');
    expect(text).toContain('TP-TEST-2026-000001');
    expect(text).not.toContain('20 %');
  });
});
