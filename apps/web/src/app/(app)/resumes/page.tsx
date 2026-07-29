import { ResumeLibrary } from '@/components/resumes/resume-library';

export default function ResumesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Resume library</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Keep every version in one place
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Upload PDF or DOCX resumes, mark a primary, and download anytime. New uploads are parsed
          automatically so you can apply headline, skills, education, and experience to your career
          profile.
        </p>
      </div>
      <ResumeLibrary />
    </div>
  );
}
