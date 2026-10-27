export type InvoicePdfModel = {
  invoiceNumber: string;
  issueDateIso: string;
  specimen: boolean;
  kind: 'INVOICE' | 'CREDIT_NOTE';
  status: string;
  issuerName: string;
  issuerAddress: string;
  issuerLegalId: string;
  recipientName: string;
  recipientEmail: string;
  description: string;
  planCode: string;
  periodLabel: string;
  amountMad: string;
  taxLabel: string;
  taxMad: string;
  totalMad: string;
  currency: string;
  paymentReference: string;
  environment: 'TEST' | 'LIVE';
};

export function renderInvoicePdf(model: InvoicePdfModel): Buffer {
  const banner = model.specimen
    ? 'SPECIMEN — NON VALABLE FISCALEMENT'
    : model.kind === 'CREDIT_NOTE'
      ? 'AVOIR / CREDIT NOTE'
      : 'FACTURE';
  const lines = [
    banner,
    '',
    'ThesisPartner',
    model.issuerName,
    model.issuerAddress,
    model.issuerLegalId,
    '',
    `Document ${model.invoiceNumber}`,
    `Date ${model.issueDateIso}`,
    `Statut ${model.status}`,
    `Environnement ${model.environment}`,
    '',
    `Destinataire ${model.recipientName}`,
    model.recipientEmail,
    '',
    model.description,
    `Offre ${model.planCode}`,
    `Periode ${model.periodLabel}`,
    `Montant HT ${model.amountMad} ${model.currency}`,
    `${model.taxLabel} ${model.taxMad} ${model.currency}`,
    `Total ${model.totalMad} ${model.currency}`,
    `Reference paiement ${model.paymentReference}`,
  ];
  return assemblePdf(lines);
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function assemblePdf(lines: string[]): Buffer {
  const content =
    'BT /F1 11 Tf 14 TL 50 780 Td\n' +
    lines
      .map((line, index) => `${index === 0 ? '' : 'T* '}(${pdfEscape(line.slice(0, 120))}) Tj`)
      .join('\n') +
    '\nET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body, 'latin1');
  let xrefTable = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xrefTable += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${xrefTable}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, 'latin1');
}
