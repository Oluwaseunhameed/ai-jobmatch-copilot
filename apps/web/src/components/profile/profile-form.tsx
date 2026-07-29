'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ProfileFormSkeleton } from '@/components/profile/profile-form-skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  getProfile,
  updateProfile,
  type CareerProfile,
  type ProfileEducation,
  type ProfileSkill,
  type ProfileWorkExperience,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

const EMPLOYMENT = ['full-time', 'part-time', 'contract', 'freelance', 'internship'] as const;
const LOCATIONS = ['remote', 'hybrid', 'on-site'] as const;
const SKILL_CATEGORIES = ['technical', 'soft', 'language', 'tool', 'domain', 'other'] as const;
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

type FormState = Omit<
  CareerProfile,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'skills' | 'education' | 'workExperience'
> & {
  skills: ProfileSkill[];
  education: ProfileEducation[];
  workExperience: ProfileWorkExperience[];
  desiredRolesText: string;
};

function toForm(p: CareerProfile): FormState {
  return {
    headline: p.headline,
    summary: p.summary,
    phone: p.phone,
    address: p.address,
    city: p.city,
    country: p.country,
    timeZone: p.timeZone,
    portfolioUrl: p.portfolioUrl,
    githubUrl: p.githubUrl,
    linkedinUrl: p.linkedinUrl,
    websiteUrl: p.websiteUrl,
    currentJobTitle: p.currentJobTitle,
    yearsOfExperience: p.yearsOfExperience,
    desiredRoles: p.desiredRoles,
    desiredRolesText: p.desiredRoles.join(', '),
    employmentType: p.employmentType,
    salaryExpectation: p.salaryExpectation,
    salaryCurrency: p.salaryCurrency ?? 'USD',
    noticePeriodDays: p.noticePeriodDays,
    workAuthorization: p.workAuthorization,
    visaSponsorshipNeeded: p.visaSponsorshipNeeded,
    workLocationPreference: p.workLocationPreference,
    completenessScore: p.completenessScore,
    skills: p.skills.length
      ? p.skills
      : [{ name: '', category: 'technical', level: 'intermediate', years: null }],
    education: p.education?.length
      ? p.education
      : [{ school: '', degree: null, field: null, startYear: null, endYear: null, description: null }],
    workExperience: p.workExperience?.length
      ? p.workExperience
      : [
          {
            title: '',
            company: '',
            location: null,
            startMonth: null,
            endMonth: null,
            isCurrent: false,
            description: null,
            highlights: [],
          },
        ],
  };
}

export function ProfileForm() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getProfile()
      .then((p) => setForm(toForm(p)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const score = form?.completenessScore ?? 0;

  const scoreTone = useMemo(() => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-muted-foreground';
  }, [score]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const desiredRoles = form.desiredRolesText
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const saved = await updateProfile({
        headline: form.headline,
        summary: form.summary,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        timeZone: form.timeZone,
        portfolioUrl: form.portfolioUrl,
        githubUrl: form.githubUrl,
        linkedinUrl: form.linkedinUrl,
        websiteUrl: form.websiteUrl,
        currentJobTitle: form.currentJobTitle,
        yearsOfExperience: form.yearsOfExperience,
        desiredRoles,
        employmentType: form.employmentType,
        salaryExpectation: form.salaryExpectation,
        salaryCurrency: form.salaryCurrency,
        noticePeriodDays: form.noticePeriodDays,
        workAuthorization: form.workAuthorization,
        visaSponsorshipNeeded: form.visaSponsorshipNeeded,
        workLocationPreference: form.workLocationPreference,
        skills: form.skills.filter((s) => s.name.trim()),
        education: form.education.filter((e) => e.school.trim()),
        workExperience: form.workExperience.filter((e) => e.title.trim() && e.company.trim()),
      });
      setForm(toForm(saved));
      setMessage('Profile saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProfileFormSkeleton />;
  }

  if (!form) {
    return <p className="text-sm text-destructive">{error ?? 'Profile unavailable'}</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <div className="space-y-8">
        <Section title="Overview" description="How you present yourself to recruiters and AI matching.">
          <Field label="Professional headline" htmlFor="headline">
            <Input
              id="headline"
              value={form.headline ?? ''}
              onChange={(e) => setField('headline', e.target.value)}
              placeholder="Senior Full-Stack Engineer · Platform & AI"
            />
          </Field>
          <Field label="Summary" htmlFor="summary">
            <Textarea
              id="summary"
              value={form.summary ?? ''}
              onChange={(e) => setField('summary', e.target.value)}
              placeholder="A short professional summary (at least a few sentences)."
              rows={5}
            />
          </Field>
        </Section>

        <Section title="Career preferences" description="Roles and constraints used for job matching.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current job title" htmlFor="title">
              <Input
                id="title"
                value={form.currentJobTitle ?? ''}
                onChange={(e) => setField('currentJobTitle', e.target.value)}
              />
            </Field>
            <Field label="Years of experience" htmlFor="yoe">
              <Input
                id="yoe"
                type="number"
                min={0}
                max={60}
                value={form.yearsOfExperience ?? ''}
                onChange={(e) =>
                  setField('yearsOfExperience', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </Field>
          </div>
          <Field label="Desired roles (comma-separated)" htmlFor="roles">
            <Input
              id="roles"
              value={form.desiredRolesText}
              onChange={(e) => setField('desiredRolesText', e.target.value)}
              placeholder="Frontend Engineer, Product Engineer"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employment type" htmlFor="employment">
              <Select
                id="employment"
                value={form.employmentType ?? ''}
                onChange={(v) => setField('employmentType', v || null)}
                options={EMPLOYMENT.map((v) => ({ value: v, label: v }))}
              />
            </Field>
            <Field label="Work location" htmlFor="locationPref">
              <Select
                id="locationPref"
                value={form.workLocationPreference ?? ''}
                onChange={(v) => setField('workLocationPreference', v || null)}
                options={LOCATIONS.map((v) => ({ value: v, label: v }))}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Salary expectation" htmlFor="salary">
              <Input
                id="salary"
                type="number"
                min={0}
                value={form.salaryExpectation ?? ''}
                onChange={(e) =>
                  setField('salaryExpectation', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Currency" htmlFor="currency">
              <Input
                id="currency"
                value={form.salaryCurrency ?? 'USD'}
                onChange={(e) => setField('salaryCurrency', e.target.value)}
              />
            </Field>
            <Field label="Notice period (days)" htmlFor="notice">
              <Input
                id="notice"
                type="number"
                min={0}
                value={form.noticePeriodDays ?? ''}
                onChange={(e) =>
                  setField('noticePeriodDays', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </Field>
          </div>
          <Field label="Work authorization" htmlFor="auth">
            <Input
              id="auth"
              value={form.workAuthorization ?? ''}
              onChange={(e) => setField('workAuthorization', e.target.value)}
              placeholder="e.g. US citizen, EU Blue Card, needs sponsorship"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={form.visaSponsorshipNeeded}
              onChange={(e) => setField('visaSponsorshipNeeded', e.target.checked)}
            />
            Needs visa sponsorship
          </label>
        </Section>

        <Section title="Location & contact" description="Where you are and how to reach you.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="city">
              <Input id="city" value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} />
            </Field>
            <Field label="Country" htmlFor="country">
              <Input
                id="country"
                value={form.country ?? ''}
                onChange={(e) => setField('country', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Address" htmlFor="address">
            <Input
              id="address"
              value={form.address ?? ''}
              onChange={(e) => setField('address', e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone">
              <Input
                id="phone"
                value={form.phone ?? ''}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </Field>
            <Field label="Timezone" htmlFor="tz">
              <Input
                id="tz"
                value={form.timeZone ?? ''}
                onChange={(e) => setField('timeZone', e.target.value)}
                placeholder="America/New_York"
              />
            </Field>
          </div>
        </Section>

        <Section title="Links" description="Public profiles that strengthen your candidacy.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn" htmlFor="linkedin">
              <Input
                id="linkedin"
                value={form.linkedinUrl ?? ''}
                onChange={(e) => setField('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </Field>
            <Field label="GitHub" htmlFor="github">
              <Input
                id="github"
                value={form.githubUrl ?? ''}
                onChange={(e) => setField('githubUrl', e.target.value)}
                placeholder="https://github.com/..."
              />
            </Field>
            <Field label="Portfolio" htmlFor="portfolio">
              <Input
                id="portfolio"
                value={form.portfolioUrl ?? ''}
                onChange={(e) => setField('portfolioUrl', e.target.value)}
              />
            </Field>
            <Field label="Website" htmlFor="website">
              <Input
                id="website"
                value={form.websiteUrl ?? ''}
                onChange={(e) => setField('websiteUrl', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Work experience" description="Roles that power matching and resume tailoring.">
          <div className="space-y-3">
            {form.workExperience.map((exp, index) => (
              <div
                key={index}
                className="space-y-2 rounded-xl border border-border/80 bg-card/50 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Job title"
                    value={exp.title}
                    onChange={(e) => {
                      const workExperience = [...form.workExperience];
                      workExperience[index] = { ...exp, title: e.target.value };
                      setField('workExperience', workExperience);
                    }}
                  />
                  <Input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => {
                      const workExperience = [...form.workExperience];
                      workExperience[index] = { ...exp, company: e.target.value };
                      setField('workExperience', workExperience);
                    }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Location"
                    value={exp.location ?? ''}
                    onChange={(e) => {
                      const workExperience = [...form.workExperience];
                      workExperience[index] = { ...exp, location: e.target.value || null };
                      setField('workExperience', workExperience);
                    }}
                  />
                  <Input
                    placeholder="Start (YYYY-MM)"
                    value={exp.startMonth ?? ''}
                    onChange={(e) => {
                      const workExperience = [...form.workExperience];
                      workExperience[index] = { ...exp, startMonth: e.target.value || null };
                      setField('workExperience', workExperience);
                    }}
                  />
                  <Input
                    placeholder="End (YYYY-MM)"
                    value={exp.isCurrent ? '' : (exp.endMonth ?? '')}
                    disabled={exp.isCurrent}
                    onChange={(e) => {
                      const workExperience = [...form.workExperience];
                      workExperience[index] = { ...exp, endMonth: e.target.value || null };
                      setField('workExperience', workExperience);
                    }}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={Boolean(exp.isCurrent)}
                    onChange={(e) => {
                      const workExperience = [...form.workExperience];
                      workExperience[index] = {
                        ...exp,
                        isCurrent: e.target.checked,
                        endMonth: e.target.checked ? null : exp.endMonth,
                      };
                      setField('workExperience', workExperience);
                    }}
                  />
                  Current role
                </label>
                <Textarea
                  placeholder="Summary"
                  value={exp.description ?? ''}
                  rows={2}
                  onChange={(e) => {
                    const workExperience = [...form.workExperience];
                    workExperience[index] = { ...exp, description: e.target.value || null };
                    setField('workExperience', workExperience);
                  }}
                />
                <div className="flex justify-end">
                  <Tooltip content="Remove experience">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove experience"
                      onClick={() =>
                        setField(
                          'workExperience',
                          form.workExperience.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField('workExperience', [
                ...form.workExperience,
                {
                  title: '',
                  company: '',
                  location: null,
                  startMonth: null,
                  endMonth: null,
                  isCurrent: false,
                  description: null,
                  highlights: [],
                },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add experience
          </Button>
        </Section>

        <Section title="Education" description="Degrees and programs on your profile.">
          <div className="space-y-3">
            {form.education.map((edu, index) => (
              <div
                key={index}
                className="space-y-2 rounded-xl border border-border/80 bg-card/50 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="School"
                    value={edu.school}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...edu, school: e.target.value };
                      setField('education', education);
                    }}
                  />
                  <Input
                    placeholder="Degree"
                    value={edu.degree ?? ''}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...edu, degree: e.target.value || null };
                      setField('education', education);
                    }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Field of study"
                    value={edu.field ?? ''}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = { ...edu, field: e.target.value || null };
                      setField('education', education);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Start year"
                    value={edu.startYear ?? ''}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = {
                        ...edu,
                        startYear: e.target.value === '' ? null : Number(e.target.value),
                      };
                      setField('education', education);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="End year"
                    value={edu.endYear ?? ''}
                    onChange={(e) => {
                      const education = [...form.education];
                      education[index] = {
                        ...edu,
                        endYear: e.target.value === '' ? null : Number(e.target.value),
                      };
                      setField('education', education);
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Tooltip content="Remove education">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove education"
                      onClick={() =>
                        setField(
                          'education',
                          form.education.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField('education', [
                ...form.education,
                {
                  school: '',
                  degree: null,
                  field: null,
                  startYear: null,
                  endYear: null,
                  description: null,
                },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add education
          </Button>
        </Section>

        <Section title="Skills" description="Add at least three skills for stronger matching.">
          <div className="space-y-3">
            {form.skills.map((skill, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-xl border border-border/80 bg-card/50 p-3 sm:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto]"
              >
                <Input
                  placeholder="Skill name"
                  value={skill.name}
                  onChange={(e) => {
                    const skills = [...form.skills];
                    skills[index] = { ...skill, name: e.target.value };
                    setField('skills', skills);
                  }}
                />
                <Select
                  id={`cat-${index}`}
                  value={skill.category}
                  onChange={(v) => {
                    const skills = [...form.skills];
                    skills[index] = { ...skill, category: v || 'other' };
                    setField('skills', skills);
                  }}
                  options={SKILL_CATEGORIES.map((v) => ({ value: v, label: v }))}
                />
                <Select
                  id={`lvl-${index}`}
                  value={skill.level ?? ''}
                  onChange={(v) => {
                    const skills = [...form.skills];
                    skills[index] = { ...skill, level: v || null };
                    setField('skills', skills);
                  }}
                  options={SKILL_LEVELS.map((v) => ({ value: v, label: v }))}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Years"
                  value={skill.years ?? ''}
                  onChange={(e) => {
                    const skills = [...form.skills];
                    skills[index] = {
                      ...skill,
                      years: e.target.value === '' ? null : Number(e.target.value),
                    };
                    setField('skills', skills);
                  }}
                />
                <Tooltip content="Remove skill">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove skill"
                    onClick={() =>
                      setField(
                        'skills',
                        form.skills.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField('skills', [
                ...form.skills,
                { name: '', category: 'technical', level: 'intermediate', years: null },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add skill
          </Button>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button onClick={() => void save()} disabled={saving} className="min-w-[130px]">
            {saving ? <Spinner label="Saving profile" /> : 'Save profile'}
          </Button>
          {message && <p className="text-sm text-success">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface-panel p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Completeness
          </p>
          <p className={cn('mt-2 font-display text-4xl font-semibold tabular-nums', scoreTone)}>
            {score}%
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Fill headline, summary, roles, location, links, and at least three skills to reach a
            strong match score.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-lg border border-border bg-card/80 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
