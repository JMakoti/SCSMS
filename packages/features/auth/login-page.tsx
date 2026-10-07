"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  School,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { loginSchema } from "../schemas/login-schema";
import type { LoginFormValues } from "../types/forms";

type LoginUser = {
  email: string;
};

export function LoginPage({
  authenticate,
  onLogin,
  errorMessage = "",
}: {
  authenticate?: (values: LoginFormValues) => Promise<LoginUser>;
  onLogin: (user: LoginUser) => void;
  errorMessage?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const {
    formState: { isSubmitting },
    register,
    handleSubmit,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const submit = async (values: LoginFormValues) => {
    setError("");

    if (authenticate) {
      try {
        const user = await authenticate(values);
        onLogin(user);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }

      return;
    }

    // if (
    //   values.email === "admin@scsms.go.ke" &&
    //   values.password === "Admin@123"
    // ) {
    onLogin({ email: values.email });
    //   return;
    // }
    // setError("Use the demo credentials shown below.");
  };
  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">
            <School />
          </span>
          <div>
            <strong>SC-SMS</strong>
            <small>Sub-County Education Office</small>
          </div>
        </div>
        <div className="login-intro">
          <span className="eyebrow">Secure access</span>
          <h1>Welcome back</h1>
          <p>
            Sign in to manage schools, enrollment, staff, and infrastructure.
          </p>
        </div>
        <form className="login-form" onSubmit={handleSubmit(submit)}>
          <label>
            Email address
            <div className="login-input">
              <Mail />
              <input type="email" {...register("email")} autoComplete="email" />
            </div>
          </label>
          <label>
            Password
            <div className="login-input">
              <LockKeyhole />
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {(error || errorMessage) && (
            <p className="login-error" role="alert">
              {error || errorMessage}
            </p>
          )}
          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"} <ChevronRight />
          </button>
        </form>
        <Link className="login-database-link" href="/database-test">
          <span>
            <Database />
            Database test
          </span>
          <ArrowUpRight />
        </Link>
        <div className="login-demo">
          <strong>Demo credentials</strong>
          <span>Email: admin@scsms.go.ke</span>
          <span>Password: Admin@123</span>
        </div>
        <p className="login-footer">SC-SMS · Education records management</p>
      </div>
    </main>
  );
}

export default LoginPage;
