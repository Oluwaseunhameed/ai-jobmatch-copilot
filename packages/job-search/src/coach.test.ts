import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CareerGrowthHubDto } from '@jobmatch/types';

import {
  buildTemplateCoachReply,
  buildWelcomeReply,
  normalizeFocus,
  sessionTitle,
  snapCoachContext,
} from './coach';

const hub: CareerGrowthHubDto = {
  summary: 'Focus on TypeScript and system design to unlock senior roles.',
  skillGaps: [
    {
      skill: 'TypeScript',
      priority: 'high',
      jobCount: 40,
      demandPct: 55,
      reason: 'Appears in most backend listings',
    },
    {
      skill: 'Kubernetes',
      priority: 'medium',
      jobCount: 20,
      demandPct: 30,
      reason: 'Common for platform roles',
    },
  ],
  roadmap: [
    {
      order: 1,
      skill: 'TypeScript',
      title: 'Deepen TypeScript',
      description: 'Practice advanced types',
      estimatedHours: 12,
      resources: [],
    },
  ],
  certifications: [
    {
      name: 'AWS SAA',
      provider: 'Amazon',
      skill: 'AWS',
      url: 'https://example.com',
      level: 'associate',
    },
  ],
  trendingTechnologies: [],
  careerPaths: [
    {
      id: 'p1',
      title: 'Backend → Senior Backend',
      currentLevel: 'mid',
      nextLevel: 'senior',
      readinessPct: 62,
      focusSkills: ['TypeScript'],
      detail: 'Close TypeScript and system design gaps.',
    },
  ],
  salaryGrowth: {
    currency: 'USD',
    period: 'year',
    expectation: 90000,
    marketMedian: 110000,
    marketMin: 80000,
    marketMax: 140000,
    roleCount: 25,
    deltaPct: -18,
    detail: 'Your expectation is ~18% below catalog median for similar roles.',
  },
  promotionReadiness: {
    score: 58,
    level: 'partial',
    targetSeniority: 'senior',
    yearsGap: 1,
    skillCoveragePct: 70,
    checklist: [
      { id: 'c1', label: 'Ship a cross-team project', done: false, detail: 'Show scope' },
      { id: 'c2', label: 'Mentor a junior', done: true, detail: 'Done' },
    ],
    detail: 'You are partially ready for senior.',
  },
  market: { activeJobs: 100, skillsAnalyzed: 40 },
};

describe('career coach', () => {
  it('snapshots growth hub context and welcomes by focus', () => {
    const context = snapCoachContext(hub);
    assert.equal(context.topGaps[0]?.skill, 'TypeScript');
    assert.ok(context.promotion.checklistOpen.includes('Ship a cross-team project'));

    const welcome = buildWelcomeReply(context, 'skill_gaps');
    assert.equal(welcome.source, 'template');
    assert.match(welcome.content, /TypeScript/);
  });

  it('builds focused template replies from user questions', () => {
    const context = snapCoachContext(hub);
    const salary = buildTemplateCoachReply({
      context,
      focus: 'general',
      userMessage: 'How does my salary compare?',
      history: [],
    });
    assert.match(salary.content, /18%/);

    const promo = buildTemplateCoachReply({
      context,
      focus: 'general',
      userMessage: 'Am I ready for promotion?',
      history: [],
    });
    assert.match(promo.content, /58%/);
    assert.match(promo.content, /Ship a cross-team project/);
  });

  it('normalizes focus and titles sessions', () => {
    assert.equal(normalizeFocus('salary'), 'salary');
    assert.equal(normalizeFocus('nope'), 'general');
    assert.equal(sessionTitle('roadmap', null), 'Learning roadmap session');
    assert.match(sessionTitle('general', 'What should I learn first?'), /learn first/);
  });
});
