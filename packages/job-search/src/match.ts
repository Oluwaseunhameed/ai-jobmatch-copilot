import { prisma } from '@jobmatch/database';
import type { JobDto, JobSkillMatch } from '@jobmatch/types';

/**
 * Light alias map so common résumé spellings still hit seeded job skills.
 * Keys and values are already normalised (see `normalizeSkill`).
 */
const SKILL_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  'node.js': 'node',
  nodejs: 'node',
  'react.js': 'react',
  reactjs: 'react',
  'next.js': 'nextjs',
  next: 'nextjs',
  'vue.js': 'vue',
  vuejs: 'vue',
  'nuxt.js': 'nuxt',
  postgres: 'postgresql',
  golang: 'go',
  k8s: 'kubernetes',
  aws: 'amazon web services',
  gcp: 'google cloud',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  llm: 'large language models',
  '.net': 'dotnet',
  'c++': 'cpp',
  'c#': 'csharp',
};

/**
 * Curated tech/product skills scanned in JD prose when boards omit skill tags.
 * Prefer specific multi-word phrases; short ambiguous tokens are handled carefully.
 */
export const SKILL_LEXICON: readonly string[] = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'Kotlin',
  'Swift',
  'Objective-C',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Scala',
  'Elixir',
  'Clojure',
  'Dart',
  'R',
  'C++',
  'C#',
  '.NET',
  'Node.js',
  'Deno',
  'Bun',
  'React',
  'React Native',
  'Next.js',
  'Vue',
  'Nuxt',
  'Angular',
  'Svelte',
  'SvelteKit',
  'SolidJS',
  'Redux',
  'GraphQL',
  'REST',
  'gRPC',
  'tRPC',
  'HTML',
  'CSS',
  'Tailwind',
  'Sass',
  'Webpack',
  'Vite',
  'Express',
  'NestJS',
  'FastAPI',
  'Django',
  'Flask',
  'Laravel',
  'Symfony',
  'Rails',
  'Spring Boot',
  'Spring',
  'ASP.NET',
  'PostgreSQL',
  'MySQL',
  'MariaDB',
  'MongoDB',
  'Redis',
  'Elasticsearch',
  'Meilisearch',
  'OpenSearch',
  'Cassandra',
  'DynamoDB',
  'SQLite',
  'Prisma',
  'Sequelize',
  'TypeORM',
  'SQLAlchemy',
  'Kafka',
  'RabbitMQ',
  'SQS',
  'Pub/Sub',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Ansible',
  'Pulumi',
  'AWS',
  'Amazon Web Services',
  'GCP',
  'Google Cloud',
  'Azure',
  'Cloudflare',
  'Vercel',
  'Heroku',
  'DigitalOcean',
  'Linux',
  'Git',
  'GitHub',
  'GitLab',
  'CI/CD',
  'GitHub Actions',
  'Jenkins',
  'CircleCI',
  'Datadog',
  'Sentry',
  'Prometheus',
  'Grafana',
  'OpenTelemetry',
  'Snowflake',
  'BigQuery',
  'Redshift',
  'dbt',
  'Airflow',
  'Spark',
  'Hadoop',
  'Pandas',
  'NumPy',
  'PyTorch',
  'TensorFlow',
  'scikit-learn',
  'Machine Learning',
  'Deep Learning',
  'NLP',
  'Computer Vision',
  'Large Language Models',
  'LLMs',
  'LangChain',
  'OpenAI',
  'Anthropic',
  'Hugging Face',
  'RAG',
  'Vector Databases',
  'pgvector',
  'Pinecone',
  'Weaviate',
  'Figma',
  'Storybook',
  'Jest',
  'Vitest',
  'Cypress',
  'Playwright',
  'Selenium',
  'Testing Library',
  'Pytest',
  'JUnit',
  'SwiftUI',
  'Jetpack Compose',
  'Flutter',
  'Android',
  'iOS',
  'Xcode',
  'Android Studio',
  'Firebase',
  'Supabase',
  'Clerk',
  'Auth0',
  'OAuth',
  'OIDC',
  'JWT',
  'Stripe',
  'Paystack',
  'Segment',
  'Mixpanel',
  'Amplitude',
  'Snowflake',
  'Looker',
  'Tableau',
  'Power BI',
  'Agile',
  'Scrum',
  'Kanban',
  'Jira',
  'Confluence',
  'Linear',
  'Notion',
  'MCP',
  'Cursor',
  'Claude Code',
  'Codex',
];

/** Collapse casing, punctuation, and whitespace for fuzzy equality. */
export function normalizeSkill(raw: string): string {
  let value = raw.trim().toLowerCase();
  // Preserve common language tokens before stripping punctuation.
  value = value.replace(/c\+\+/g, 'cpp').replace(/c#/g, 'csharp');
  value = value
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SKILL_ALIASES[value] ?? value;
}

function canonicalSkill(raw: string): string {
  return normalizeSkill(raw);
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when `skill` appears as a whole token/phrase in `haystack`
 * (already lowercased). Avoids `java` matching inside `javascript`.
 */
export function skillMentionedInText(haystackLower: string, skill: string): boolean {
  const raw = skill.trim();
  if (!raw || !haystackLower) return false;

  const variants = new Set<string>([raw.toLowerCase()]);
  const key = normalizeSkill(raw);
  if (key) variants.add(key);

  // Also try dotted originals for Node.js / Next.js style labels.
  if (raw.includes('.')) variants.add(raw.toLowerCase());

  for (const variant of variants) {
    if (!variant) continue;

    if (variant === 'cpp') {
      if (/(^|[^a-z0-9])c\+\+(?![a-z0-9])/i.test(haystackLower)) return true;
      continue;
    }
    if (variant === 'csharp') {
      if (/(^|[^a-z0-9])c#(?![a-z0-9])/i.test(haystackLower)) return true;
      continue;
    }
    if (variant === 'dotnet' || variant === '.net') {
      if (/(^|[^a-z0-9])\.?net(?![a-z0-9])/i.test(haystackLower)) return true;
      continue;
    }
    if (variant === 'go' || variant === 'golang') {
      // Prefer explicit Go/Golang mentions; avoid matching "going".
      if (/(^|[^a-z0-9])(golang|go lang)(?![a-z0-9])/i.test(haystackLower)) return true;
      if (/(^|[^a-z0-9])go(?![a-z0-9])/i.test(haystackLower) && /\bgo\b/.test(haystackLower)) {
        // Require nearby engineering context to cut false positives.
        if (
          /\b(go|golang)\b.{0,40}\b(lang(uage)?|developer|engineer|service|backend|goroutine|module)\b/i.test(
            haystackLower,
          ) ||
          /\b(lang(uage)?|developer|engineer|backend|service)\b.{0,40}\b(go|golang)\b/i.test(
            haystackLower,
          )
        ) {
          return true;
        }
      }
      continue;
    }
    if (variant === 'r') {
      if (/(^|[^a-z0-9])r(?![a-z0-9])/.test(haystackLower) && /\br\b.{0,20}\b(lang|studio|package)/i.test(haystackLower)) {
        return true;
      }
      continue;
    }
    if (variant === 'ai' || variant === 'artificial intelligence') {
      if (
        /\bartificial intelligence\b/.test(haystackLower) ||
        /(^|[^a-z0-9])ai(?![a-z0-9])/.test(haystackLower)
      ) {
        return true;
      }
      continue;
    }

    const escaped = escapeRegExp(variant).replace(/\s+/g, '\\s+');
    // Allow trailing punctuation (AWS. / Laravel,) but not letters (java≠javascript).
    const pattern = new RegExp(`(^|[^a-z0-9.+#])${escaped}(?![a-z0-9])`, 'i');
    if (!pattern.test(haystackLower)) continue;

    return true;
  }

  return false;
}

/**
 * Find which candidate skills are mentioned in free text (title + description).
 * Longer phrases are matched first to prefer "React Native" over "React".
 */
export function extractSkillsFromText(
  text: string,
  candidates: readonly string[],
): string[] {
  if (!text.trim() || candidates.length === 0) return [];

  const haystack = text.toLowerCase();
  const ordered = [...candidates].sort((a, b) => b.trim().length - a.trim().length);
  const found: string[] = [];
  const seen = new Set<string>();

  for (const candidate of ordered) {
    const key = canonicalSkill(candidate);
    if (!key || seen.has(key)) continue;
    if (!skillMentionedInText(haystack, candidate)) continue;
    seen.add(key);
    found.push(candidate.trim());
  }

  return found;
}

export type JobSkillSource = Pick<JobDto, 'skills'> & {
  title?: string | null;
  description?: string | null;
  requirements?: string[] | null;
};

/**
 * Build the skill list used for match scoring: stored tags + skills mentioned
 * in the JD (lexicon + profile skills). Dedupes by normalised key.
 */
export function resolveJobSkillsForMatch(
  job: JobSkillSource,
  profileSkills: readonly string[] = [],
): string[] {
  const prose = [job.title, job.description, ...(job.requirements ?? [])]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join('\n');

  const fromTags = (job.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const fromLexicon = extractSkillsFromText(prose, SKILL_LEXICON);
  const fromProfile = extractSkillsFromText(prose, profileSkills);

  const merged: string[] = [];
  const seen = new Set<string>();

  for (const skill of [...fromTags, ...fromLexicon, ...fromProfile]) {
    const key = canonicalSkill(skill);
    if (!key || seen.has(key)) continue;
    // Skip coarse board categories that aren't real skills.
    if (isCoarseCategory(key) && fromLexicon.length + fromProfile.length > 0) continue;
    seen.add(key);
    merged.push(skill);
  }

  return merged.slice(0, 60);
}

function isCoarseCategory(normalized: string): boolean {
  return (
    normalized === 'software development' ||
    normalized === 'software engineering' ||
    normalized === 'other' ||
    normalized === 'engineering' ||
    normalized === 'it' ||
    normalized === 'design' ||
    normalized === 'product' ||
    normalized === 'marketing' ||
    normalized === 'customer support' ||
    normalized === 'devops' ||
    normalized === 'data'
  );
}

/**
 * Score how well a profile covers a job's skills (tags + JD mentions).
 *
 * Uses job-skill coverage (`matched / jobSkills`) rather than Jaccard so a
 * broad profile does not dilute the score against a short requirements list.
 * Returns null when either side has no skills to compare.
 */
export function matchJobSkills(
  profileSkills: readonly string[],
  jobSkills: readonly string[],
): JobSkillMatch | null {
  if (profileSkills.length === 0 || jobSkills.length === 0) {
    return null;
  }

  const profileKeys = new Set(profileSkills.map(canonicalSkill).filter(Boolean));
  if (profileKeys.size === 0) return null;

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const seen = new Set<string>();

  for (const skill of jobSkills) {
    const key = canonicalSkill(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (profileKeys.has(key)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const compared = matchedSkills.length + missingSkills.length;
  if (compared === 0) return null;

  return {
    matchScore: Math.round((matchedSkills.length / compared) * 100),
    matchedSkills,
    missingSkills,
  };
}

/**
 * Match a profile against a job, extracting skills from the JD when tags are
 * missing or incomplete.
 */
export function matchJobAgainstProfile(
  job: JobSkillSource,
  profileSkills: readonly string[],
): JobSkillMatch | null {
  const resolved = resolveJobSkillsForMatch(job, profileSkills);
  return matchJobSkills(profileSkills, resolved);
}

export function applySkillMatch<T extends JobSkillSource>(
  job: T,
  profileSkills: readonly string[],
): T & Partial<JobSkillMatch> {
  const resolved = resolveJobSkillsForMatch(job, profileSkills);
  const match = matchJobSkills(profileSkills, resolved);
  if (!match) {
    // Still surface JD-inferred skills when the profile is empty/unmatched.
    if (resolved.length && resolved !== job.skills) {
      return { ...job, skills: resolved };
    }
    return { ...job };
  }
  return {
    ...job,
    skills: resolved,
    matchScore: match.matchScore,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
  };
}

export function enrichJobsWithMatch<T extends JobSkillSource>(
  jobs: T[],
  profileSkills: readonly string[],
): Array<T & Partial<JobSkillMatch>> {
  return jobs.map((job) => applySkillMatch(job, profileSkills));
}

/** Stable descending sort by match score (missing scores sort last). */
export function sortJobsByMatchScore<T extends { matchScore?: number; id: string }>(
  jobs: T[],
): T[] {
  return [...jobs].sort((a, b) => {
    const scoreA = a.matchScore ?? -1;
    const scoreB = b.matchScore ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });
}

export async function loadProfileSkillNames(userId: string): Promise<string[]> {
  const profile = await prisma.careerProfile.findUnique({
    where: { userId },
    select: { skills: { select: { name: true } } },
  });
  return profile?.skills.map((skill) => skill.name) ?? [];
}
