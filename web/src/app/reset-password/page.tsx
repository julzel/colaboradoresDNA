import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthPageShell>
      <AuthForm mode="reset" resetToken={token} />
    </AuthPageShell>
  );
}
