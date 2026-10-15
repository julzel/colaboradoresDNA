import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthPageShell>
      <AuthForm
        mode="reset"
        resetToken={typeof token === "string" ? token : ""}
        resetError={typeof error === "string" ? error : error ? "INVALID_TOKEN" : ""}
      />
    </AuthPageShell>
  );
}
