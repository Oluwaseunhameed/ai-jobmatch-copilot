import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Soften legacy single-line JDs that lost structure during earlier ingest. */
export function recoverCollapsedJobDescription(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes('\n')) return trimmed;

  const markers = [
    'About the Company',
    'About Engineering',
    'About the role',
    'About the Role',
    'The Role',
    "What You'll Own",
    'What You Will Own',
    'What makes this role exciting',
    'Problems to Solve',
    'What Success Looks Like',
    'Requirements',
    'Who You Are',
    'Good to Know',
    "Tech You'll Touch",
    'Responsibilities',
    'Benefits',
    'About ',
  ];

  let result = trimmed;
  for (const marker of markers) {
    const pattern = new RegExp(`(?<!^)(${escapeRegExp(marker)})`, 'g');
    result = result.replace(pattern, '\n\n## $1\n\n');
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

export function jobDescriptionExcerpt(text: string, max = 220): string {
  const plain = recoverCollapsedJobDescription(text)
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trimEnd()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Professional job-description renderer: headings, paragraphs, lists, bold/italic.
 * Expects Markdown-ish text from ingest (`htmlToJobDescription`).
 */
export function JobDescription({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const normalized = recoverCollapsedJobDescription(content).replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return <p className="text-sm text-muted-foreground">No description provided.</p>;
  }

  const blocks = normalized.split(/\n{2,}/);

  return (
    <div
      className={cn(
        'job-description space-y-4 text-sm leading-relaxed text-muted-foreground',
        className,
      )}
    >
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trimEnd());
        const heading = block.match(/^#{1,3}\s+(.+)$/);
        if (heading && !block.includes('\n')) {
          return (
            <h3
              key={index}
              className="font-display text-base font-semibold tracking-tight text-foreground"
            >
              {renderInline(heading[1]!.trim())}
            </h3>
          );
        }

        const isList = lines.length > 0 && lines.every((line) => /^\s*([-*•]|\d+\.)\s+/.test(line));
        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5 marker:text-primary/70">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="pl-1">
                  {renderInline(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.some((line) => /^\s*([-*•]|\d+\.)\s+/.test(line))) {
          return (
            <div key={index} className="space-y-3">
              {groupMixedLines(lines).map((group, groupIndex) =>
                group.type === 'list' ? (
                  <ul
                    key={groupIndex}
                    className="list-disc space-y-2 pl-5 marker:text-primary/70"
                  >
                    {group.lines.map((line, lineIndex) => (
                      <li key={lineIndex} className="pl-1">
                        {renderInline(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={groupIndex}>{renderInline(group.lines.join(' '))}</p>
                ),
              )}
            </div>
          );
        }

        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function groupMixedLines(
  lines: string[],
): Array<{ type: 'list' | 'text'; lines: string[] }> {
  const groups: Array<{ type: 'list' | 'text'; lines: string[] }> = [];
  for (const line of lines) {
    const type = /^\s*([-*•]|\d+\.)\s+/.test(line) ? 'list' : 'text';
    const last = groups[groups.length - 1];
    if (last && last.type === type) last.lines.push(line);
    else groups.push({ type, lines: [line] });
  }
  return groups;
}

function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(pattern);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
