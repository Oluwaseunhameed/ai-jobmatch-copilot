import type {
  CodingAttemptDto,
  CodingDifficulty,
  CodingPerformanceDto,
  CodingPracticeSessionDto,
  CodingProblemDto,
  CodingProblemStyle,
} from '@jobmatch/types';
import {
  CODING_DIFFICULTIES,
  CODING_STYLE_LABELS,
  isCodingDifficulty,
  isCodingProblemStyle,
} from '@jobmatch/types';

export type CodingJobInput = {
  id: string;
  title: string;
  skills: string[];
  seniority: string;
  companyName?: string;
};

type BankItem = Omit<CodingProblemDto, 'id'> & { key: string; skillTags: string[] };

const BANK: BankItem[] = [
  {
    key: 'two-sum',
    title: 'Pair Sum Lookup',
    style: 'leetcode',
    difficulty: 'easy',
    topics: ['arrays', 'hash map'],
    skillTags: ['javascript', 'typescript', 'python', 'java', 'go'],
    prompt:
      'Given an array of integers and a target, return the indices of two numbers that add up to the target. Assume exactly one solution and you may not use the same element twice.',
    constraints: ['2 ≤ n ≤ 10^4', 'Values fit in 32-bit integers', 'O(n) time expected'],
    examples: ['nums = [2,7,11,15], target = 9 → [0,1]'],
    hints: ['A hash map of value → index avoids nested loops.'],
    approach: 'Single pass: for each value x, check if target - x was seen; otherwise store x.',
    reviewChecklist: [
      'Handles duplicates correctly',
      'Does not reuse the same index',
      'Explains time/space complexity',
    ],
    timeLimitMinutes: 20,
  },
  {
    key: 'valid-parens',
    title: 'Balanced Brackets',
    style: 'leetcode',
    difficulty: 'easy',
    topics: ['stack', 'strings'],
    skillTags: ['javascript', 'typescript', 'python', 'java'],
    prompt: 'Given a string containing (), {}, and [], determine if the input is valid (correctly nested and closed).',
    constraints: ['1 ≤ length ≤ 10^4'],
    examples: ['"([])" → true', '"(]" → false'],
    hints: ['Push opening brackets; pop on closing and compare pairs.'],
    approach: 'Stack matching with a pair map; empty stack at end means valid.',
    reviewChecklist: ['Empty string edge case', 'Early exit on mismatch', 'O(n) space justified'],
    timeLimitMinutes: 15,
  },
  {
    key: 'merge-intervals',
    title: 'Merge Overlapping Intervals',
    style: 'leetcode',
    difficulty: 'medium',
    topics: ['sorting', 'intervals'],
    skillTags: ['javascript', 'typescript', 'python', 'java'],
    prompt: 'Given intervals [start, end], merge all overlapping intervals and return a list of non-overlapping intervals.',
    constraints: ['1 ≤ n ≤ 10^4'],
    examples: ['[[1,3],[2,6],[8,10]] → [[1,6],[8,10]]'],
    hints: ['Sort by start; extend the last merged end when overlapping.'],
    approach: 'Sort, then linear scan merging into a result list.',
    reviewChecklist: ['Sort comparator correct', 'Touching endpoints merged or not per spec', 'Mutating vs new arrays'],
    timeLimitMinutes: 30,
  },
  {
    key: 'lru-cache',
    title: 'LRU Cache',
    style: 'leetcode',
    difficulty: 'hard',
    topics: ['design', 'hash map', 'linked list'],
    skillTags: ['javascript', 'typescript', 'python', 'java', 'go'],
    prompt: 'Design a data structure that follows Least Recently Used cache eviction with O(1) get and put.',
    constraints: ['Capacity ≥ 1', 'Operations up to 2·10^5'],
    examples: ['put(1,1), put(2,2), get(1)→1, put(3,3) evicts 2'],
    hints: ['Hash map + doubly linked list (or ordered map).'],
    approach: 'Map keys to nodes; move-to-front on access; evict tail on overflow.',
    reviewChecklist: ['True O(1) ops', 'Capacity edge cases', 'Null/missing key handling'],
    timeLimitMinutes: 45,
  },
  {
    key: 'hr-freq',
    title: 'Frequency Counter',
    style: 'hackerrank',
    difficulty: 'easy',
    topics: ['hashing', 'strings'],
    skillTags: ['python', 'javascript', 'typescript'],
    prompt:
      'HackerRank-style: read n strings, then q queries. For each query string, print how many times it appeared in the list.',
    constraints: ['1 ≤ n,q ≤ 1000', 'Strings length ≤ 20'],
    examples: ['list=["ab","ab","abc"], queries=["ab","abc","bc"] → 2,1,0'],
    hints: ['Build a frequency map once, then answer queries in O(1).'],
    approach: 'Count with a map/dict; answer each query with get-or-zero.',
    reviewChecklist: ['Case sensitivity', 'IO parsing clean', 'No O(n·q) nested scans'],
    timeLimitMinutes: 20,
  },
  {
    key: 'hr-matrix',
    title: 'Diagonal Difference',
    style: 'hackerrank',
    difficulty: 'easy',
    topics: ['matrices', 'math'],
    skillTags: ['python', 'javascript', 'java'],
    prompt: 'Given a square matrix, compute the absolute difference between the sums of its primary and secondary diagonals.',
    constraints: ['1 ≤ n ≤ 100'],
    examples: ['[[1,2,3],[4,5,6],[9,8,9]] → |15-17| = 2'],
    hints: ['Primary: i==j; secondary: i+j==n-1.'],
    approach: 'Single pass accumulating both diagonals.',
    reviewChecklist: ['Odd n center counted once each', 'Absolute value', 'Integer overflow not an issue'],
    timeLimitMinutes: 15,
  },
  {
    key: 'hr-warmup-sort',
    title: 'Closest Numbers',
    style: 'hackerrank',
    difficulty: 'medium',
    topics: ['sorting'],
    skillTags: ['python', 'javascript', 'java', 'go'],
    prompt:
      'Given a list of integers, find all pairs with the smallest absolute difference and print them ascending.',
    constraints: ['2 ≤ n ≤ 2·10^5'],
    examples: ['[5,4,3,2] → 2 3 3 4 4 5'],
    hints: ['Sort first; min adjacent delta is the answer distance.'],
    approach: 'Sort, find min adjacent gap, collect all pairs with that gap.',
    reviewChecklist: ['Stable output order', 'Handles negatives', 'O(n log n)'],
    timeLimitMinutes: 25,
  },
  {
    key: 'th-api-rate',
    title: 'Mini Rate Limiter',
    style: 'takehome',
    difficulty: 'medium',
    topics: ['system design', 'apis'],
    skillTags: ['node', 'typescript', 'javascript', 'python', 'go'],
    prompt:
      'Take-home style: implement an in-memory rate limiter allowing N requests per user per sliding window of W seconds. Explain trade-offs vs fixed windows.',
    constraints: ['Thread-safety optional for MVP', 'Document complexity'],
    examples: ['N=3,W=60 — 4th call within window rejected'],
    hints: ['Deque of timestamps per key; drop expired on each check.'],
    approach: 'Per-key queue of request times; prune older than now-W; admit if length < N.',
    reviewChecklist: ['Sliding vs fixed window explained', 'Memory growth bounded', 'API surface clear'],
    timeLimitMinutes: 60,
  },
  {
    key: 'th-url-short',
    title: 'URL Shortener Service Sketch',
    style: 'takehome',
    difficulty: 'hard',
    topics: ['system design', 'databases'],
    skillTags: ['backend', 'node', 'typescript', 'python', 'java', 'go'],
    prompt:
      'Design and stub a tiny URL shortener: create short codes, redirect, and handle collisions. Include storage schema and one failure mode.',
    constraints: ['No need for full production hardening'],
    examples: ['POST /shorten → {code}; GET /:code → 302'],
    hints: ['Base62 ids or hash+retry; unique index on code.'],
    approach: 'Generate code, insert with uniqueness retry, map code→url; discuss read path caching.',
    reviewChecklist: ['Collision strategy', 'Idempotency', 'Analytics deferred consciously'],
    timeLimitMinutes: 90,
  },
  {
    key: 'th-react-list',
    title: 'Virtualized List Notes',
    style: 'takehome',
    difficulty: 'medium',
    topics: ['frontend', 'performance'],
    skillTags: ['react', 'typescript', 'javascript', 'frontend'],
    prompt:
      'Describe how you would implement a virtualized list for 50k rows in React (windowing). Outline props, scroll math, and one accessibility concern.',
    constraints: ['Code sketch or pseudocode acceptable'],
    examples: ['Only ~20 DOM nodes for visible window'],
    hints: ['itemHeight * index for offset; overscan rows.'],
    approach: 'Compute start/end indices from scrollTop; render slice with translateY spacer.',
    reviewChecklist: ['Variable height mentioned', 'Keyboard focus', 'Overscan'],
    timeLimitMinutes: 45,
  },
  {
    key: 'sql-second-highest',
    title: 'Second Highest Salary',
    style: 'leetcode',
    difficulty: 'medium',
    topics: ['sql'],
    skillTags: ['sql', 'postgresql', 'mysql', 'database'],
    prompt: 'Write SQL to find the second highest distinct salary from an Employee table. Return null if none.',
    constraints: ['Standard SQL preferred'],
    examples: ['salaries 100,200,200 → 100'],
    hints: ['DENSE_RANK or ORDER BY DISTINCT with OFFSET.'],
    approach: 'Select max salary below the overall max, or rank and filter rank=2.',
    reviewChecklist: ['NULLS', 'Ties', 'Empty table'],
    timeLimitMinutes: 20,
  },
  {
    key: 'graph-bfs',
    title: 'Shortest Path in Unweighted Graph',
    style: 'leetcode',
    difficulty: 'medium',
    topics: ['graphs', 'bfs'],
    skillTags: ['python', 'javascript', 'typescript', 'java', 'go'],
    prompt: 'Given an undirected unweighted graph as adjacency lists, return the shortest path length from source to target (or -1).',
    constraints: ['n ≤ 10^4'],
    examples: ['Classic BFS levels'],
    hints: ['BFS guarantees shortest path in unweighted graphs.'],
    approach: 'Queue BFS with visited set; track distance per node.',
    reviewChecklist: ['Visited before enqueue', 'Disconnected graph', 'source==target → 0'],
    timeLimitMinutes: 30,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function seniorityDifficulties(seniority: string): CodingDifficulty[] {
  const key = seniority.toLowerCase();
  if (key === 'intern' || key === 'junior') return ['easy', 'medium'];
  if (key === 'lead' || key === 'principal') return ['medium', 'hard'];
  return ['easy', 'medium', 'hard'];
}

export function inferCodingStyles(job?: CodingJobInput | null): CodingProblemStyle[] {
  if (!job) return ['leetcode', 'hackerrank', 'takehome'];
  const text = `${job.title} ${job.skills.join(' ')}`.toLowerCase();
  const styles = new Set<CodingProblemStyle>(['leetcode']);
  if (/backend|platform|sre|devops|api|engineer|developer/.test(text)) styles.add('hackerrank');
  if (/senior|staff|lead|principal|architect|frontend|full.?stack/.test(text)) styles.add('takehome');
  if (/intern|junior/.test(text)) styles.add('hackerrank');
  return (['leetcode', 'hackerrank', 'takehome'] as CodingProblemStyle[]).filter((s) =>
    styles.has(s),
  );
}

function skillScore(item: BankItem, skills: string[]): number {
  if (!skills.length) return 0;
  const norms = skills.map((s) => s.toLowerCase());
  return item.skillTags.reduce((sum, tag) => {
    if (norms.some((s) => s.includes(tag) || tag.includes(s))) return sum + 2;
    return sum;
  }, 0);
}

export function buildCodingPack(input?: {
  job?: CodingJobInput | null;
  styles?: CodingProblemStyle[];
  difficulties?: CodingDifficulty[];
  limit?: number;
}): {
  styles: CodingProblemStyle[];
  difficulties: CodingDifficulty[];
  problems: CodingProblemDto[];
  timeBudgetMinutes: number;
  summary: string;
} {
  const job = input?.job ?? null;
  const styles =
    input?.styles?.filter(isCodingProblemStyle).length
      ? input.styles.filter(isCodingProblemStyle)
      : inferCodingStyles(job);
  const difficulties =
    input?.difficulties?.filter(isCodingDifficulty).length
      ? input.difficulties.filter(isCodingDifficulty)
      : job
        ? seniorityDifficulties(job.seniority)
        : [...CODING_DIFFICULTIES];
  const limit = Math.min(Math.max(input?.limit ?? 6, 3), 10);
  const skills = job?.skills ?? [];

  const pool = BANK.filter(
    (item) => styles.includes(item.style) && difficulties.includes(item.difficulty),
  );
  const ranked = [...(pool.length ? pool : BANK)].sort((a, b) => {
    const scoreDiff = skillScore(b, skills) - skillScore(a, skills);
    if (scoreDiff !== 0) return scoreDiff;
    const order = { easy: 0, medium: 1, hard: 2 };
    return order[a.difficulty] - order[b.difficulty];
  });

  const picked = ranked.slice(0, limit);
  const prefix = job ? slugify(job.id) : 'general';
  const problems: CodingProblemDto[] = picked.map((item) => ({
    id: `${prefix}-${item.key}`,
    title: item.title,
    style: item.style,
    difficulty: item.difficulty,
    topics: item.topics,
    prompt: item.prompt,
    constraints: item.constraints,
    examples: item.examples,
    hints: item.hints,
    approach: item.approach,
    reviewChecklist: item.reviewChecklist,
    timeLimitMinutes: item.timeLimitMinutes,
  }));

  const timeBudgetMinutes = problems.reduce((sum, p) => sum + p.timeLimitMinutes, 0);
  const company = job?.companyName ? ` for ${job.companyName}` : '';
  const role = job ? ` · ${job.title}` : '';
  const styleLabels = styles.map((s) => CODING_STYLE_LABELS[s]).join(', ');
  const summary = `Coding prep pack${company}${role}: ${problems.length} problems (${styleLabels}) with a ${timeBudgetMinutes}-minute timed budget. Track attempts and use the review checklist as a lightweight code review.`;

  return { styles, difficulties, problems, timeBudgetMinutes, summary };
}

export function computeCodingPerformance(
  problems: CodingProblemDto[],
  attempts: CodingAttemptDto[],
): CodingPerformanceDto {
  const byId = new Map(attempts.map((a) => [a.problemId, a]));
  let solved = 0;
  let attempted = 0;
  let skipped = 0;
  let ratingSum = 0;
  let rated = 0;
  let timeUsedMinutes = 0;

  for (const problem of problems) {
    const attempt = byId.get(problem.id);
    if (!attempt || attempt.status === 'todo') continue;
    if (attempt.status === 'solved') solved += 1;
    else if (attempt.status === 'skipped') skipped += 1;
    else attempted += 1;
    if (attempt.selfRating != null && attempt.selfRating >= 1) {
      ratingSum += Math.min(5, Math.max(1, attempt.selfRating));
      rated += 1;
    }
    if (attempt.minutesSpent != null && attempt.minutesSpent > 0) {
      timeUsedMinutes += attempt.minutesSpent;
    }
  }

  const total = problems.length || 1;
  const completion = (solved + attempted * 0.5) / total;
  const ratingFactor = rated > 0 ? ratingSum / rated / 5 : 0.5;
  const score = Math.round(Math.min(100, completion * 70 + ratingFactor * 30));
  const timeBudgetMinutes = problems.reduce((sum, p) => sum + p.timeLimitMinutes, 0);
  const avgSelfRating = rated > 0 ? Math.round((ratingSum / rated) * 10) / 10 : null;

  let detail = 'Start a problem and mark it solved, attempted, or skipped to build your score.';
  if (solved + attempted + skipped > 0) {
    detail = `Solved ${solved}/${problems.length}. Score blends completion and self-rated confidence.`;
  }

  return {
    solved,
    attempted,
    skipped,
    total: problems.length,
    avgSelfRating,
    timeUsedMinutes,
    timeBudgetMinutes,
    score,
    detail,
  };
}

export function codingSessionStatus(
  problems: CodingProblemDto[],
  attempts: CodingAttemptDto[],
): 'ready' | 'practicing' | 'completed' {
  if (attempts.length === 0) return 'ready';
  const done = new Set(
    attempts.filter((a) => a.status !== 'todo').map((a) => a.problemId),
  );
  if (problems.every((p) => done.has(p.id))) return 'completed';
  return 'practicing';
}

export function toCodingSessionDto(row: {
  id: string;
  userId: string;
  jobId: string | null;
  status: string;
  styles: string[];
  difficulties: string[];
  problemsJson: unknown;
  attemptsJson: unknown;
  performanceScore: number | null;
  timeBudgetMinutes: number | null;
  summary: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  job?: { id: string; title: string; slug: string; company: { name: string } } | null;
}): CodingPracticeSessionDto {
  const problems = Array.isArray(row.problemsJson)
    ? (row.problemsJson as CodingProblemDto[])
    : [];
  const attempts = Array.isArray(row.attemptsJson)
    ? (row.attemptsJson as CodingAttemptDto[])
    : [];
  const performance =
    attempts.length > 0 ? computeCodingPerformance(problems, attempts) : null;

  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    status: row.status,
    styles: row.styles,
    difficulties: row.difficulties,
    problems,
    attempts,
    performanceScore: row.performanceScore,
    timeBudgetMinutes: row.timeBudgetMinutes,
    performance,
    summary: row.summary,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    job: row.job
      ? {
          id: row.job.id,
          title: row.job.title,
          slug: row.job.slug,
          companyName: row.job.company.name,
        }
      : null,
  };
}
