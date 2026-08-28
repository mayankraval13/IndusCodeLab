import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, IdCard, Loader2, Lock, Mail, User } from "lucide-react";
import { z } from "zod";
import AuthImagePattern from "../components/AuthImagePattern.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import Logo from "../components/ui/Logo.jsx";

const SignUpSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    enrollmentNo: z
      .string()
      .trim()
      .min(6, "Enter your college enrollment number"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine(
    (data) =>
      data.password.toUpperCase() !== data.enrollmentNo.toUpperCase(),
    {
      path: ["password"],
      message: "Password cannot be the same as your enrollment number",
    }
  );

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { signup, isSigninUp } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(SignUpSchema) });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ll-bg">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Logo />
            <h1 className="text-2xl font-bold mt-6">Create account</h1>
            <p className="text-ll-muted mt-1 text-sm">Join LeetLab and start solving today</p>
          </div>

          <form onSubmit={handleSubmit((data) => signup(data))} className="space-y-5">
            <Field label="Name" error={errors.name?.message}>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type="text"
                  {...register("name")}
                  className="ll-input w-full py-2.5 pl-11 pr-3.5"
                  placeholder="Your name"
                />
              </div>
            </Field>

            <Field
              label="Enrollment number"
              error={errors.enrollmentNo?.message}
            >
              <div className="relative">
                <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type="text"
                  autoCapitalize="characters"
                  spellCheck={false}
                  {...register("enrollmentNo")}
                  className="ll-input w-full py-2.5 pl-11 pr-3.5 uppercase"
                  placeholder="IU2341230001"
                />
              </div>
            </Field>

            <Field label="College email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type="email"
                  {...register("email")}
                  className="ll-input w-full py-2.5 pl-11 pr-3.5"
                  placeholder="you@iite.indusuni.ac.in"
                />
              </div>
              <p className="text-xs text-ll-muted mt-1.5">
                Personal email addresses cannot be used to sign up.
              </p>
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("password")}
                  className="ll-input w-full py-2.5 pl-11 pr-11"
                  placeholder="At least 8 characters"
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
              disabled={isSigninUp}
              className="ll-btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isSigninUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </button>
          </form>

          <p className="text-center text-ll-muted text-sm mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-ll-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <AuthImagePattern
        title="Start your journey"
        subtitle="Practice algorithms, track progress, and compete with yourself."
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