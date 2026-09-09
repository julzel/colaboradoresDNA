import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
export default function SignInPage() {
  return (
    <AuthPageShell>
      <AuthForm />
    </AuthPageShell>
  );
}
