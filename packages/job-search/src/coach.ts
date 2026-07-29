import type {
  CareerCoachSessionDto,
  CareerGrowthHubDto,
  CoachContextDto,
  CoachFocus,
  CoachMessageDto,
} from '@jobmatch/types';
import { COACH_FOCUS_LABELS, isCoachFocus } from '@jobmatch/types';

export type CoachReply = {
  content: string;
  source: 'template' | 'llm';
};

export function snapCoachContext(
  hub: CareerGrowthHubDto,
  memory?: { summary?: string | null; facts?: string[] } | null,
): CoachContextDto {
  return {
    summary: hub.summary,
    topGaps: hub.skillGaps.slice(0, 6).map((g) => ({
      skill: g.skill,
      priority: g.priority,
      reason: g.reason,
    })),
    roadmapSteps: hub.roadmap.slice(0, 6).map((s) => ({
      title: s.title,
      skill: s.skill,
      estimatedHours: s.estimatedHours,
    })),
    certifications: hub.certifications.slice(0, 4).map((c) => ({
      name: c.name,
      skill: c.skill,
    })),
    careerPaths: hub.careerPaths.slice(0, 3).map((p) => ({
      title: p.title,
      readinessPct: p.readinessPct,
      detail: p.detail,
    })),
    salaryDetail: hub.salaryGrowth?.detail ?? null,
    promotion: {
      score: hub.promotionReadiness.score,
      level: hub.promotionReadiness.level,
      targetSeniority: hub.promotionReadiness.targetSeniority,
      detail: hub.promotionReadiness.detail,
      checklistOpen: hub.promotionReadiness.checklist
        .filter((item) => !item.done)
        .slice(0, 4)
        .map((item) => item.label),
    },
    market: hub.market,
    memorySummary: memory?.summary?.trim() || '',
    memoryFacts: memory?.facts?.slice(0, 12) ?? [],
  };
}

export function sessionTitle(focus: CoachFocus, firstUserMessage?: string | null): string {
  const label = COACH_FOCUS_LABELS[focus];
  const trimmed = firstUserMessage?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed.length > 64 ? `${trimmed.slice(0, 61)}…` : trimmed;
  }
  return `${label} session`;
}

export function normalizeFocus(value?: string | null): CoachFocus {
  if (value && isCoachFocus(value)) return value;
  return 'general';
}

export function newMessageId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeMessage(
  role: CoachMessageDto['role'],
  content: string,
  source?: CoachMessageDto['source'],
): CoachMessageDto {
  return {
    id: newMessageId(),
    role,
    content: content.trim(),
    ...(role === 'assistant' && source ? { source } : {}),
    createdAt: new Date().toISOString(),
  };
}

export function buildWelcomeReply(context: CoachContextDto, focus: CoachFocus): CoachReply {
  const gaps = context.topGaps.map((g) => g.skill).slice(0, 3);
  const gapLine = gaps.length
    ? `Your top skill gaps right now are ${gaps.join(', ')}.`
    : 'Your profile already covers most high-demand skills in the catalog.';

  const focusOpeners: Record<CoachFocus, string> = {
    skill_gaps: `Let's close the skills that matter most for roles you're targeting. ${gapLine}`,
    roadmap: context.roadmapSteps[0]
      ? `Your Growth Hub roadmap starts with “${context.roadmapSteps[0].title}”. I can help you sequence the next steps.`
      : 'Your roadmap is thin until more market gaps show up — tell me what role you want next.',
    salary: context.salaryDetail
      ? `On compensation: ${context.salaryDetail}`
      : 'I can help you frame salary expectations once more catalog roles match your currency and level.',
    promotion: `Promotion readiness is ${context.promotion.score}% toward ${context.promotion.targetSeniority}. ${context.promotion.detail}`,
    career_path: context.careerPaths[0]
      ? `A strong path on your hub is “${context.careerPaths[0].title}” (${context.careerPaths[0].readinessPct}% ready).`
      : 'Add desired roles on your profile so I can suggest clearer career ladders.',
    general: `I'm your career coach grounded in the Growth Hub (not generic advice). ${gapLine} Ask about skills, roadmap, salary, or promotion readiness.`,
  };

  const next = nextActions(context, focus);
  return {
    source: 'template',
    content: `${focusOpeners[focus]}\n\n${next}`,
  };
}

export function buildTemplateCoachReply(input: {
  context: CoachContextDto;
  focus: CoachFocus;
  userMessage: string;
  history: CoachMessageDto[];
}): CoachReply {
  const text = input.userMessage.toLowerCase();
  const inferred = inferFocusFromMessage(text, input.focus);

  let body: string;
  switch (inferred) {
    case 'salary':
      body = input.context.salaryDetail
        ? `${input.context.salaryDetail}\n\nIf your expectation is below market, prepare a case with 2–3 quantified wins and the skills employers list most often. If you're above market, emphasise rare skills and leadership impact.`
        : 'Salary signals are limited for your profile currency/role mix. Broaden desired roles or skills so the hub can compare you against more catalog listings.';
      break;
    case 'promotion':
      body = [
        `Readiness score: ${input.context.promotion.score}% (${input.context.promotion.level}) toward ${input.context.promotion.targetSeniority}.`,
        input.context.promotion.detail,
        input.context.promotion.checklistOpen.length
          ? `Open checklist items: ${input.context.promotion.checklistOpen.join('; ')}.`
          : 'Your promotion checklist looks largely complete — focus on evidence in interviews and applications.',
      ].join('\n\n');
      break;
    case 'career_path':
      body = input.context.careerPaths.length
        ? input.context.careerPaths
            .map(
              (p) =>
                `• ${p.title} — ${p.readinessPct}% ready. ${p.detail}`,
            )
            .join('\n')
        : 'No ladder suggestions yet. Set desired roles on your profile (e.g. Senior Backend Engineer) and reopen Growth.';
      break;
    case 'roadmap':
      body = input.context.roadmapSteps.length
        ? [
            'Suggested learning sequence from your Growth Hub:',
            ...input.context.roadmapSteps.map(
              (s, i) =>
                `${i + 1}. ${s.title}${s.estimatedHours ? ` (~${s.estimatedHours}h)` : ''}`,
            ),
            input.context.certifications.length
              ? `Optional credentials: ${input.context.certifications.map((c) => c.name).join(', ')}.`
              : '',
          ]
            .filter(Boolean)
            .join('\n')
        : 'No roadmap steps yet — fill skill gaps on your profile or wait for more active jobs in the catalog.';
      break;
    case 'skill_gaps':
    default: {
      if (input.context.topGaps.length === 0) {
        body =
          'You have strong coverage against current catalog demand. Stretch by targeting a harder seniority band or a neighbouring stack.';
      } else {
        const lines = input.context.topGaps.slice(0, 4).map(
          (g) => `• ${g.skill} (${g.priority}) — ${g.reason}`,
        );
        body = `Prioritise these gaps before polishing secondary skills:\n${lines.join('\n')}`;
      }
      break;
    }
  }

  const followUp = nextActions(input.context, inferred);
  const turnHint =
    input.history.filter((m) => m.role === 'user').length >= 2
      ? '\n\nYou can also open Interview or Practice from the Career nav to rehearse what you learn here.'
      : '';

  return {
    source: 'template',
    content: `${body}\n\n${followUp}${turnHint}`,
  };
}

function inferFocusFromMessage(text: string, fallback: CoachFocus): CoachFocus {
  if (/\b(salary|comp|pay|compensation|raise)\b/.test(text)) return 'salary';
  if (/\b(promot\w*|senior|lead|staff|level.?up)\b/.test(text)) return 'promotion';
  if (/\b(path|ladder|career.?change|next.?role)\b/.test(text)) return 'career_path';
  if (/\b(roadmap|learn|course|study|curriculum)\b/.test(text)) return 'roadmap';
  if (/\b(skill|gap|missing|stack)\b/.test(text)) return 'skill_gaps';
  return fallback;
}

function nextActions(context: CoachContextDto, focus: CoachFocus): string {
  switch (focus) {
    case 'salary':
      return 'Ask me: “How should I negotiate?” or “Which skills lift my band?”';
    case 'promotion':
      return 'Ask me: “What evidence should I collect?” or “Which skill unlocks the next level?”';
    case 'career_path':
      return 'Ask me: “Which path fits me best?” or “What should I learn for that path?”';
    case 'roadmap':
      return 'Ask me: “What should I study this week?” or “Which cert is worth it?”';
    case 'skill_gaps':
      return context.topGaps[0]
        ? `Ask me: “How do I learn ${context.topGaps[0].skill}?” or “What should I prioritise first?”`
        : 'Ask me anything about your growth plan.';
    default:
      return 'Try: skill gaps, learning roadmap, salary, promotion readiness, or career paths.';
  }
}

export function toCareerCoachSessionDto(row: {
  id: string;
  userId: string;
  status: string;
  focus: string;
  title: string | null;
  messagesJson: unknown;
  contextJson: unknown;
  summary: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}): CareerCoachSessionDto {
  const messages = Array.isArray(row.messagesJson)
    ? (row.messagesJson as CoachMessageDto[])
    : [];
  const context =
    row.contextJson && typeof row.contextJson === 'object'
      ? (row.contextJson as CoachContextDto)
      : null;

  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    focus: row.focus,
    title: row.title,
    messages,
    context,
    summary: row.summary,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
