import { prisma, type Prisma } from '@jobmatch/database';
import type {
  CareerCoachSessionDto,
  CoachContextDto,
  CoachFocus,
  CoachMessageDto,
} from '@jobmatch/types';

import {
  buildTemplateCoachReply,
  buildWelcomeReply,
  makeMessage,
  normalizeFocus,
  sessionTitle,
  snapCoachContext,
  toCareerCoachSessionDto,
} from './coach';
import { aiServiceUrl } from './embed';
import { getCareerGrowthHub } from './growth-service';

export {
  buildTemplateCoachReply,
  buildWelcomeReply,
  makeMessage,
  normalizeFocus,
  sessionTitle,
  snapCoachContext,
  toCareerCoachSessionDto,
} from './coach';

type AiCoachChatResponse = {
  reply: string;
  source: 'template' | 'llm' | string;
  llm?: {
    enabled?: boolean;
    used?: boolean;
    model?: string | null;
    error?: string | null;
  };
};

function coachTimeoutMs() {
  const raw = Number(process.env.AI_SERVICE_COACH_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const fallback = Number(process.env.AI_SERVICE_TIMEOUT_MS);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 45_000;
}

async function callCoachAi(input: {
  focus: CoachFocus;
  context: CoachContextDto;
  messages: Array<{ role: string; content: string }>;
  userMessage: string;
}): Promise<AiCoachChatResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), coachTimeoutMs());
  try {
    const response = await fetch(`${aiServiceUrl()}/v1/coach/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus: input.focus,
        user_message: input.userMessage,
        context: input.context,
        messages: input.messages.slice(-12),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as AiCoachChatResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function generateAssistantReply(input: {
  focus: CoachFocus;
  context: CoachContextDto;
  messages: CoachMessageDto[];
  userMessage: string;
}) {
  const history = input.messages.map((m) => ({ role: m.role, content: m.content }));
  const ai = await callCoachAi({
    focus: input.focus,
    context: input.context,
    messages: history,
    userMessage: input.userMessage,
  });

  if (ai?.reply?.trim() && ai.source === 'llm') {
    return {
      content: ai.reply.trim(),
      source: 'llm' as const,
    };
  }

  // Prefer AI template if service returned one; else local template.
  if (ai?.reply?.trim()) {
    return {
      content: ai.reply.trim(),
      source: 'template' as const,
    };
  }

  return buildTemplateCoachReply({
    context: input.context,
    focus: input.focus,
    userMessage: input.userMessage,
    history: input.messages,
  });
}

export async function listCoachSessions(userId: string): Promise<CareerCoachSessionDto[]> {
  const rows = await prisma.careerCoachSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map(toCareerCoachSessionDto);
}

export async function getCoachSession(
  userId: string,
  id: string,
): Promise<CareerCoachSessionDto | null> {
  const row = await prisma.careerCoachSession.findFirst({
    where: { id, userId },
  });
  return row ? toCareerCoachSessionDto(row) : null;
}

export async function createCoachSession(input: {
  userId: string;
  focus?: string;
  message?: string | null;
}): Promise<CareerCoachSessionDto> {
  const focus = normalizeFocus(input.focus);
  const hub = await getCareerGrowthHub(input.userId);
  const context = snapCoachContext(hub);
  const welcome = buildWelcomeReply(context, focus);
  const messages: CoachMessageDto[] = [makeMessage('assistant', welcome.content, welcome.source)];

  const userText = input.message?.trim() || null;
  let source = welcome.source;

  if (userText) {
    messages.push(makeMessage('user', userText));
    const reply = await generateAssistantReply({
      focus,
      context,
      messages,
      userMessage: userText,
    });
    messages.push(makeMessage('assistant', reply.content, reply.source));
    source = reply.source;
  }

  const row = await prisma.careerCoachSession.create({
    data: {
      userId: input.userId,
      status: 'active',
      focus,
      title: sessionTitle(focus, userText),
      messagesJson: messages as unknown as Prisma.InputJsonValue,
      contextJson: context as unknown as Prisma.InputJsonValue,
      summary: hub.summary,
      source,
    },
  });

  return toCareerCoachSessionDto(row);
}

export async function appendCoachMessage(input: {
  userId: string;
  id: string;
  message: string;
}): Promise<CareerCoachSessionDto | null> {
  const existing = await prisma.careerCoachSession.findFirst({
    where: { id: input.id, userId: input.userId },
  });
  if (!existing) return null;

  const text = input.message.trim();
  if (!text) {
    throw new Error('message is required');
  }
  if (text.length > 4000) {
    throw new Error('message is too long');
  }

  const focus = normalizeFocus(existing.focus);
  const messages = Array.isArray(existing.messagesJson)
    ? ([...(existing.messagesJson as unknown as CoachMessageDto[])] as CoachMessageDto[])
    : [];
  let context =
    existing.contextJson && typeof existing.contextJson === 'object'
      ? (existing.contextJson as unknown as CoachContextDto)
      : null;

  if (!context) {
    const hub = await getCareerGrowthHub(input.userId);
    context = snapCoachContext(hub);
  }

  messages.push(makeMessage('user', text));
  const reply = await generateAssistantReply({
    focus,
    context,
    messages,
    userMessage: text,
  });
  messages.push(makeMessage('assistant', reply.content, reply.source));

  const title =
    existing.title && existing.title.trim()
      ? existing.title
      : sessionTitle(focus, text);

  const row = await prisma.careerCoachSession.update({
    where: { id: existing.id },
    data: {
      messagesJson: messages as unknown as Prisma.InputJsonValue,
      contextJson: context as unknown as Prisma.InputJsonValue,
      title,
      source: reply.source,
      status: 'active',
    },
  });

  return toCareerCoachSessionDto(row);
}

export async function deleteCoachSession(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.careerCoachSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.careerCoachSession.delete({ where: { id: existing.id } });
  return true;
}
