import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { z } from "zod";
import AuthImagePattern from "../components/AuthImagePattern.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import Logo from "../components/ui/Logo.jsx";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const { isLoggingIn, login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(LoginSchema) });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ll-bg">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Logo />
            <h1 className="text-2xl font-bold mt-6">Sign in</h1>
            <p className="text-ll-muted mt-1 text-sm">
              Continue your interview prep on LeetLab
            </p>
          </div>

          <form onSubmit={handleSubmit((data) => login(data))} className="space-y-5">
            <Field label="Email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type="email"
                  {...register("email")}
                  className="ll-input w-full py-2.5 pl-11 pr-3.5"
                  placeholder="you@example.com"
                />
              </div>
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className="ll-input w-full py-2.5 pl-11 pr-11"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ll-muted hover:text-ll-text transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="ll-btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-ll-muted text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-ll-accent hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
      <AuthImagePattern
        title="Master coding interviews"
        subtitle="Solve real problems, track submissions, and build confidence—one challenge at a time."
      />
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
