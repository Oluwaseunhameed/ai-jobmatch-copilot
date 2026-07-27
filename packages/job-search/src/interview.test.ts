import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildInterviewQuestions,
  computeConfidenceScore,
  inferInterviewCategories,
  interviewPrepStatus,
} from './interview';

describe('interview prep', () => {
  it('infers role-relevant categories', () => {
    const cats = inferInterviewCategories({
      id: 'j1',
      title: 'Senior Frontend Engineer',
      skills: ['React', 'TypeScript'],
      seniority: 'senior',
    });
    assert.ok(cats.includes('behavioral'));
    assert.ok(cats.includes('frontend'));
    assert.ok(cats.includes('system_design'));
  });

  it('builds questions and confidence from practice', () => {
    const built = buildInterviewQuestions({
      id: 'job-acme',
      title: 'Backend Engineer',
      skills: ['Node', 'PostgreSQL'],
      seniority: 'mid',
      companyName: 'Acme',
    });

    assert.ok(built.questions.length >= 4);
    assert.match(built.summary, /Acme/);

    const practice = built.questions.slice(0, 2).map((q) => ({
      questionId: q.id,
      selfRating: 4,
    }));
    const score = computeConfidenceScore(built.questions, practice);
    assert.ok(score != null && score > 0 && score < 100);
    assert.equal(interviewPrepStatus(built.questions, practice), 'practicing');

    const all = built.questions.map((q) => ({ questionId: q.id, selfRating: 5 }));
    assert.equal(interviewPrepStatus(built.questions, all), 'completed');
  });
});
