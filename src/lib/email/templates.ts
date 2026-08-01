// Transactional email bodies. Bilingual zh+en in one message (zh first): the
// better-auth send callbacks carry no locale, and a two-language body beats
// plumbing the cookie locale through auth internals for two short emails.
// Inline styles are fine here — the design guard only scans components/app.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(paragraphsHtml: string, url: string): string {
  const safeUrl = escapeHtml(url);
  return `<div style="font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
  <p style="font-weight: 700; font-size: 18px; margin: 0 0 16px;">Mercury</p>
  ${paragraphsHtml}
  <p style="margin: 24px 0;"><a href="${safeUrl}" style="display: inline-block; border: 1px solid #222; padding: 10px 20px; color: #222; text-decoration: none;">继续 · Continue</a></p>
  <p style="font-size: 12px; color: #666; word-break: break-all;">如果按钮无法点击，请复制此链接到浏览器 · If the button doesn't work, copy this link:<br>${safeUrl}</p>
</div>`;
}

export function verificationEmail({ url }: { url: string }): EmailContent {
  return {
    subject: "验证你的 Mercury 邮箱 · Verify your email",
    html: layout(
      `<p style="margin: 0 0 8px;">点击下方按钮验证你的邮箱，完成注册。链接 1 小时内有效。</p>
  <p style="margin: 0 0 8px; color: #666;">Click the button below to verify your email address. The link expires in 1 hour.</p>`,
      url,
    ),
    text: `验证你的 Mercury 邮箱（链接 1 小时内有效）· Verify your Mercury email (link expires in 1 hour):\n\n${url}\n`,
  };
}

export function resetPasswordEmail({ url }: { url: string }): EmailContent {
  return {
    subject: "重置你的 Mercury 密码 · Reset your password",
    html: layout(
      `<p style="margin: 0 0 8px;">点击下方按钮设置新密码。链接 1 小时内有效；如果不是你本人操作，请忽略此邮件。</p>
  <p style="margin: 0 0 8px; color: #666;">Click the button below to set a new password. The link expires in 1 hour; if you didn't request this, ignore this email.</p>`,
      url,
    ),
    text: `重置你的 Mercury 密码（链接 1 小时内有效）· Reset your Mercury password (link expires in 1 hour):\n\n${url}\n\n如果不是你本人操作，请忽略此邮件 · If you didn't request this, ignore this email.\n`,
  };
}
