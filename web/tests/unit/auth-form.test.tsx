import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/features/auth/components/auth-form";
import { SignUpFlow } from "@/features/auth/components/sign-up-flow";

const api = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  reset: vi.fn(),
  recover: vi.fn(),
  totp: vi.fn(),
  backup: vi.fn(),
}));
vi.mock("@/features/auth/client/auth-client", () => ({
  authClient: {
    signIn: { email: api.signIn },
    signUp: { email: api.signUp },
    requestPasswordReset: api.recover,
    resetPassword: api.reset,
    twoFactor: { verifyTotp: api.totp, verifyBackupCode: api.backup },
  },
}));
beforeEach(() => vi.clearAllMocks());

describe("application-owned authentication forms", () => {
  it("does not render a public registration form without an invitation", () => {
    render(<AuthForm mode="sign-up" />);
    expect(
      screen.queryByRole("button", { name: "Crear cuenta" }),
    ).not.toBeInTheDocument();
  });
  it("submits the invitation header and immutable invited email", async () => {
    api.signUp.mockResolvedValue({ data: {} });
    render(
      <SignUpFlow invitation="synthetic-token" invitedEmail="invited@example.test" />,
    );
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Creá tu contraseña"), {
      target: { value: "A-long-password-723!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    await screen.findByRole("heading", { name: "Revisá tu correo" });
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Creá tu contraseña")).not.toBeInTheDocument();
    expect(screen.getByText("invited@example.test")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio de sesión" })).toBeVisible();
    expect(api.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "invited@example.test",
        callbackURL: "/sign-in",
      }),
      { headers: { "x-invitation-token": "synthetic-token" } },
    );
  });
  it("handles MFA challenge and permits a backup-code attempt without bypassing verification", async () => {
    api.signIn.mockResolvedValue({ data: { twoFactorRedirect: true } });
    api.backup.mockResolvedValue({ error: { message: "Invalid" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "admin@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "A-long-password-723!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await screen.findByLabelText("Código de tu aplicación de autenticación");
    fireEvent.click(
      screen.getByRole("button", { name: "Usar código de recuperación" }),
    );
    fireEvent.change(screen.getByLabelText("Código de recuperación"), {
      target: { value: "used-code" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));
    await screen.findByText(/El código no es válido/);
    expect(api.backup).toHaveBeenCalledWith({ code: "used-code" });
    expect(api.totp).not.toHaveBeenCalled();
  });
  it("keeps password recovery feedback generic", async () => {
    api.recover.mockResolvedValue({ data: { status: true } });
    render(<AuthForm />);
    fireEvent.click(screen.getByRole("button", { name: "Olvidé mi contraseña" }));
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "unknown@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar enlace de recuperación" }),
    );
    await screen.findByText(/Si la cuenta existe/);
    expect(api.recover).toHaveBeenCalledWith({
      email: "unknown@example.test",
      redirectTo: "/reset-password",
    });
  });
  it("recovers from a network failure without exposing provider details", async () => {
    api.signIn.mockRejectedValue(new Error("Sensitive provider detail"));
    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "user@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "A-long-password-723!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await screen.findByText("No pudimos conectar. Intentá de nuevo.");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled(),
    );
    expect(screen.queryByText("Sensitive provider detail")).not.toBeInTheDocument();
  });
});
