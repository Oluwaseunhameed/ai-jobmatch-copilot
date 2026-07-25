import { AuthLayout } from '@/components/auth/auth-layout';

export default function AuthPagesLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
