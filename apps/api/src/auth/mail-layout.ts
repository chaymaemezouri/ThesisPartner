export function thesisPartnerMailHtml(input: {
  preheader: string;
  title: string;
  paragraphs: string[];
  actionUrl?: string;
  actionLabel?: string;
  footer: string;
}): string {
  const paragraphs = input.paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#334155;">${escapeHtml(text)}</p>`,
    )
    .join('');
  const action = input.actionUrl
    ? `<p style="margin:28px 0 8px;"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px;">${escapeHtml(input.actionLabel ?? 'Open')}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;word-break:break-all;">${escapeHtml(input.actionUrl)}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px 28px;">
            <tr>
              <td>
                <p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;font-weight:700;">Thesis Flow</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(input.title)}</h1>
                ${paragraphs}
                ${action}
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">${escapeHtml(input.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
