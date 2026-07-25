import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  return (
    <SignUp
      routing="path"
      path="/register"
      signInUrl="/login"
      fallbackRedirectUrl="/onboarding"
      appearance={{
        elements: {
          rootBox: 'mx-auto w-full',
          cardBox: 'w-full',
        },
      }}
    />
  );
}
