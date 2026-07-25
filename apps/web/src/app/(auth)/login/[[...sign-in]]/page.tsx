import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/register"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: 'mx-auto w-full',
          cardBox: 'w-full',
        },
      }}
    />
  );
}
