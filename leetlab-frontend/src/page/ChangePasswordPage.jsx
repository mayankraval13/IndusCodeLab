import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { useAuthStore } from "../store/useAuthStore.js";
import Logo from "../components/ui/Logo.jsx";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });

export default function ChangePasswordPage() {
  const { authUser, changePassword, isChangingPassword, logout } =
    useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(ChangePasswordSchema) });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    await changePassword({ currentPassword, newPassword });
  };

  return (
    <div className="min-h-screen bg-ll-bg flex flex-col items-center justify-center px-4 sm:px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Logo />
        </div>

        <div className="ll-panel rounded-xl p-6 sm:p-8">
          <div className="w-11 h-11 rounded-lg bg-ll-accent/15 text-ll-accent flex items-center justify-center mb-5">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-ll-muted mt-2 text-sm leading-relaxed">
            Your account was created with a temporary password. Choose a new one
            to continue.
          </p>

          {authUser?.enrollmentNo && (
            <p className="mt-4 text-xs text-ll-muted">
              Signed in as{" "}
              <span className="font-mono text-ll-text">
                {authUser.enrollmentNo}
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
            <Field
              label="Current password"
              error={errors.currentPassword?.message}
            >
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type="password"
                  autoComplete="current-password"
                  {...register("currentPassword")}
                  className="ll-input w-full py-2.5 pl-11 pr-3.5"
                  placeholder="Temporary password"
                />
              </div>
            </Field>

            <Field label="New password" error={errors.newPassword?.message}>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("newPassword")}
                  className="ll-input w-full py-2.5 pl-11 pr-11"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ll-muted hover:text-ll-text transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </Field>

            <Field
              label="Confirm new password"
              error={errors.confirmPassword?.message}
            >
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  className="ll-input w-full py-2.5 pl-11 pr-3.5"
                  placeholder="Re-enter new password"
                />
              </div>
            </Field>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="ll-btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save and continue"
              )}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full text-center text-sm text-ll-muted hover:text-ll-text transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {error && <p className="text-ll-error text-xs mt-1">{error}</p>}
    </div>
  );
}
