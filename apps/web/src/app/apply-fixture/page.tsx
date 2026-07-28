'use client';

import { useState } from 'react';

/**
 * Local demo ATS form for Wave 3 fill-only Playwright assist.
 * Submit is intentional UX — adapters must never click it.
 */
export default function ApplyFixturePage() {
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState({
    name: '',
    email: '',
    headline: '',
    cover: '',
    skills: '',
  });

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Apply fixture · fill-only demo
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Local application form
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Used by Playwright assist to practice filling fields. Adapters never click Submit —
        you must submit (or confirm in the product) yourself.
      </p>

      {submitted ? (
        <p className="mt-8 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          Form submitted locally (demo only). In product flows, use “I submitted this application”.
        </p>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Full name</span>
            <input
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Headline</span>
            <input
              name="headline"
              value={values.headline}
              onChange={(e) => setValues((v) => ({ ...v, headline: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Skills</span>
            <input
              name="skills"
              value={values.skills}
              onChange={(e) => setValues((v) => ({ ...v, skills: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Cover letter</span>
            <textarea
              name="cover"
              rows={5}
              value={values.cover}
              onChange={(e) => setValues((v) => ({ ...v, cover: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
          >
            Submit application
          </button>
        </form>
      )}
    </main>
  );
}
