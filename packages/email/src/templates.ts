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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Deep links for product emails — prefers NEXT_PUBLIC_APP_URL, then APP_URL. */
export function appUrl(path: string) {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function optimizationCompleteEmail(input: {
  name: string;
  jobTitle: string;
  companyName: string;
  beforeScore: number;
  afterScore: number;
  jobSlug: string;
}) {
  const url = appUrl(`/jobs/${input.jobSlug}`);
  const name = escapeHtml(input.name);
  const role = escapeHtml(`${input.jobTitle} at ${input.companyName}`);
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Resume optimisation ready</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">
      Hi ${name}, your tailored resume for <strong>${role}</strong> is ready.
      Keyword fit moved from <strong>${input.beforeScore}%</strong> to <strong>${input.afterScore}%</strong>.
    </p>
    ${button(url, 'View job & version')}
  `);
  const text = `Hi ${input.name}, your resume optimisation for ${input.jobTitle} at ${input.companyName} is ready (${input.beforeScore}% → ${input.afterScore}%). ${url}`;
  return { subject: `Resume ready for ${input.jobTitle} — ${BRAND}`, html, text };
}

export function applicationDraftReadyEmail(input: {
  name: string;
  jobTitle: string;
  companyName: string;
  jobSlug: string;
}) {
  const url = appUrl(`/jobs/${input.jobSlug}`);
  const name = escapeHtml(input.name);
  const role = escapeHtml(`${input.jobTitle} at ${input.companyName}`);
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Cover letter draft ready</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">
      Hi ${name}, your cover letter and short answers for <strong>${role}</strong> are ready to review and copy.
    </p>
    ${button(url, 'Open application assistant')}
  `);
  const text = `Hi ${input.name}, your cover letter draft for ${input.jobTitle} at ${input.companyName} is ready. ${url}`;
  return { subject: `Cover letter ready for ${input.jobTitle} — ${BRAND}`, html, text };
}

export function applicationStageChangedEmail(input: {
  name: string;
  jobTitle: string;
  companyName: string;
  stageLabel: string;
}) {
  const url = appUrl('/applications');
  const name = escapeHtml(input.name);
  const role = escapeHtml(`${input.jobTitle} at ${input.companyName}`);
  const stage = escapeHtml(input.stageLabel);
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Application stage updated</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">
      Hi ${name}, <strong>${role}</strong> is now in <strong>${stage}</strong>.
    </p>
    ${button(url, 'Open tracker')}
  `);
  const text = `Hi ${input.name}, ${input.jobTitle} at ${input.companyName} is now “${input.stageLabel}”. ${url}`;
  return { subject: `${input.jobTitle} → ${input.stageLabel} — ${BRAND}`, html, text };
}

export function applicationReminderEmail(input: {
  name: string;
  jobTitle: string;
  companyName: string;
  stageLabel: string;
  daysIdle: number;
}) {
  const url = appUrl('/applications');
  const name = escapeHtml(input.name);
  const role = escapeHtml(`${input.jobTitle} at ${input.companyName}`);
  const stage = escapeHtml(input.stageLabel);
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Application reminder</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">
      Hi ${name}, <strong>${role}</strong> has been in <strong>${stage}</strong> for about ${input.daysIdle} days.
      A quick follow-up or stage update may help keep momentum.
    </p>
    ${button(url, 'Review pipeline')}
  `);
  const text = `Hi ${input.name}, reminder: ${input.jobTitle} at ${input.companyName} has been in “${input.stageLabel}” for ~${input.daysIdle} days. ${url}`;
  return { subject: `Reminder: ${input.jobTitle} — ${BRAND}`, html, text };
}

export function jobAlertEmail(input: {
  name: string;
  searchName: string;
  total: number;
  jobs: Array<{ title: string; companyName: string; slug: string; location?: string | null }>;
}) {
  const url = appUrl('/jobs');
  const name = escapeHtml(input.name);
  const search = escapeHtml(input.searchName);
  const more =
    input.total > input.jobs.length
      ? `<p style="margin:16px 0 0;color:#52525b;line-height:1.6;">And ${input.total - input.jobs.length} more matching role${input.total - input.jobs.length === 1 ? '' : 's'}.</p>`
      : '';
  const list = input.jobs
    .map((job) => {
      const role = escapeHtml(`${job.title} at ${job.companyName}`);
      const loc = job.location ? ` · ${escapeHtml(job.location)}` : '';
      const href = appUrl(`/jobs/${job.slug}`);
      return `<li style="margin:0 0 10px;"><a href="${href}" style="color:${PRIMARY};text-decoration:none;font-weight:600;">${role}</a><span style="color:#71717a;">${loc}</span></li>`;
    })
    .join('');

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">New jobs for ${search}</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">
      Hi ${name}, we found <strong>${input.total}</strong> new role${input.total === 1 ? '' : 's'} matching your saved search.
    </p>
    <ul style="margin:20px 0 0;padding-left:18px;color:#18181b;line-height:1.5;">
      ${list}
    </ul>
    ${more}
    ${button(url, 'Browse matching jobs')}
  `);
  const textJobs = input.jobs
    .map((job) => `- ${job.title} at ${job.companyName}: ${appUrl(`/jobs/${job.slug}`)}`)
    .join('\n');
  const text = `Hi ${input.name}, ${input.total} new job(s) for “${input.searchName}”:\n${textJobs}\n\n${url}`;
  return { subject: `${input.total} new job${input.total === 1 ? '' : 's'} for ${input.searchName} — ${BRAND}`, html, text };
}

export function weeklyDigestEmail(input: {
  name: string;
  weekOf: string;
  savedJobs: number;
  applications: number;
  newMatches: Array<{ title: string; companyName: string; slug: string }>;
  pipelineHighlights: Array<{ jobTitle: string; companyName: string; stageLabel: string }>;
}) {
  const dashboardUrl = appUrl('/dashboard');
  const jobsUrl = appUrl('/jobs/saved');
  const appsUrl = appUrl('/applications');
  const name = escapeHtml(input.name);
  const week = escapeHtml(input.weekOf);

  const matchesList =
    input.newMatches.length === 0
      ? `<p style="margin:12px 0 0;color:#71717a;">No new catalog matches this week — try refining a saved search.</p>`
      : `<ul style="margin:12px 0 0;padding-left:18px;line-height:1.5;">${input.newMatches
          .map((job) => {
            const href = appUrl(`/jobs/${job.slug}`);
            return `<li style="margin:0 0 8px;"><a href="${href}" style="color:${PRIMARY};text-decoration:none;font-weight:600;">${escapeHtml(job.title)}</a> <span style="color:#71717a;">at ${escapeHtml(job.companyName)}</span></li>`;
          })
          .join('')}</ul>`;

  const pipelineList =
    input.pipelineHighlights.length === 0
      ? `<p style="margin:12px 0 0;color:#71717a;">No active applications yet.</p>`
      : `<ul style="margin:12px 0 0;padding-left:18px;line-height:1.5;">${input.pipelineHighlights
          .map(
            (row) =>
              `<li style="margin:0 0 8px;"><strong>${escapeHtml(row.jobTitle)}</strong> at ${escapeHtml(row.companyName)} — <span style="color:#52525b;">${escapeHtml(row.stageLabel)}</span></li>`,
          )
          .join('')}</ul>`;

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Your week in review</h2>
    <p style="margin:0;color:#52525b;line-height:1.6;">
      Hi ${name}, here’s your ${BRAND} digest for the week of <strong>${week}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;width:50%;">
          <p style="margin:0;font-size:12px;color:#71717a;text-transform:uppercase;">Saved jobs</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#18181b;">${input.savedJobs}</p>
        </td>
        <td style="width:12px;"></td>
        <td style="padding:12px;border:1px solid #e4e4e7;border-radius:8px;width:50%;">
          <p style="margin:0;font-size:12px;color:#71717a;text-transform:uppercase;">Applications</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#18181b;">${input.applications}</p>
        </td>
      </tr>
    </table>
    <h3 style="margin:24px 0 0;font-size:15px;color:#18181b;">Fresh matches</h3>
    ${matchesList}
    <h3 style="margin:24px 0 0;font-size:15px;color:#18181b;">Pipeline</h3>
    ${pipelineList}
    ${button(dashboardUrl, 'Open dashboard')}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
      <a href="${jobsUrl}" style="color:#71717a;">Saved jobs</a> ·
      <a href="${appsUrl}" style="color:#71717a;">Applications</a>
    </p>
  `);

  const textMatches =
    input.newMatches.length === 0
      ? 'No new matches this week.'
      : input.newMatches
          .map((job) => `- ${job.title} at ${job.companyName}: ${appUrl(`/jobs/${job.slug}`)}`)
          .join('\n');
  const textPipeline =
    input.pipelineHighlights.length === 0
      ? 'No active applications.'
      : input.pipelineHighlights
          .map((row) => `- ${row.jobTitle} at ${row.companyName} (${row.stageLabel})`)
          .join('\n');

  const text = [
    `Hi ${input.name}, your weekly digest (${input.weekOf}):`,
    `Saved jobs: ${input.savedJobs}`,
    `Applications: ${input.applications}`,
    '',
    'Fresh matches:',
    textMatches,
    '',
    'Pipeline:',
    textPipeline,
    '',
    dashboardUrl,
  ].join('\n');

  return { subject: `Your weekly job search digest — ${BRAND}`, html, text };
}
