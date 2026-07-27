import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortfolioBrief,
  buildProjectSuggestions,
  buildResumeBullets,
  computePortfolioReadiness,
  normalizeProjectInput,
} from './portfolio';

describe('portfolio project builder', () => {
  it('suggests skill-gap projects and builds resume bullets', () => {
    const suggestions = buildProjectSuggestions({
      skillGaps: [
        { skill: 'TypeScript', priority: 'high', reason: 'High demand' },
        { skill: 'Kubernetes', priority: 'medium' },
      ],
      limit: 3,
    });
    assert.ok(suggestions.length >= 1);
    assert.match(suggestions[0]!.title, /TypeScript/i);

    const bullets = buildResumeBullets({
      title: 'API toolkit',
      role: 'Backend engineer',
      problem: 'slow onboarding for internal APIs',
      solution: 'typed SDK and docs',
      impact: 'Cut integration time by ~40%',
      techStack: ['TypeScript', 'Node'],
    });
    assert.ok(bullets.length >= 1);
    assert.match(bullets.join(' '), /40%/);
  });

  it('scores portfolio readiness and normalizes input', () => {
    const project = {
      id: 'p1',
      userId: 'u1',
      title: 'Dashboard',
      summary: 'UI lab',
      role: 'Frontend',
      status: 'shipped',
      techStack: ['React'],
      highlights: ['Shipped responsive dashboard'],
      problem: null,
      solution: null,
      impact: null,
      repoUrl: 'https://github.com/example/dash',
      demoUrl: null,
      startMonth: null,
      endMonth: null,
      isFeatured: true,
      sortOrder: 0,
      source: 'manual',
      suggestedSkill: null,
      resumeBullets: ['Shipped responsive dashboard'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const readiness = computePortfolioReadiness([project]);
    assert.ok(readiness.score >= 50);
    assert.equal(readiness.shippedCount, 1);

    const brief = buildPortfolioBrief({
      projects: [project],
      suggestions: [],
      profileLinks: { portfolioUrl: null, githubUrl: null, websiteUrl: null },
    });
    assert.match(brief.summary, /1 portfolio project/);

    const normalized = normalizeProjectInput({
      title: '  My App  ',
      techStack: [' React ', 'React', 'Node'],
      repoUrl: 'https://github.com/acme/app',
      status: 'in_progress',
    });
    assert.equal(normalized.title, 'My App');
    assert.deepEqual(normalized.techStack, ['React', 'Node']);
    assert.equal(normalized.status, 'in_progress');
  });
});
