import { SignUpFlow } from "@/features/auth/components/sign-up-flow";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string; email?: string }>;
}) {
  const query = await searchParams;
  return (
    <AuthPageShell>
      <SignUpFlow invitation={query.invitation} invitedEmail={query.email} />
    </AuthPageShell>
  );
}
