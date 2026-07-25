const BRAND = 'AI JobMatch Copilot';
const PRIMARY = '#4f46e5';

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td style="background:${PRIMARY};padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">${BRAND}</h1>
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#71717a;">© ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:${PRIMARY};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${label}</a>`;
}

export function verificationEmail(name: string, url: string) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Verify your email</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">Hi ${name}, welcome to ${BRAND}. Please verify your email address to activate your account.</p>
    ${button(url, 'Verify email address')}
    <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">If you didn't create an account, you can safely ignore this email.</p>
  `);
  const text = `Hi ${name}, verify your email: ${url}`;
  return { subject: `Verify your email — ${BRAND}`, html, text };
}

export function passwordResetEmail(name: string, url: string) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Reset your password</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.</p>
    ${button(url, 'Reset password')}
    <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `);
  const text = `Hi ${name}, reset your password: ${url}`;
  return { subject: `Reset your password — ${BRAND}`, html, text };
}

export function emailChangeVerification(name: string, url: string) {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Confirm your new email</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">Hi ${name}, confirm your new email address for ${BRAND}.</p>
    ${button(url, 'Confirm email')}
  `);
  const text = `Hi ${name}, confirm your new email: ${url}`;
  return { subject: `Confirm your new email — ${BRAND}`, html, text };
}
