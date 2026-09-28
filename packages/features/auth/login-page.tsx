"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  School,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { loginSchema } from "../schemas/login-schema";
import type { LoginFormValues } from "../types/forms";
export function LoginPage({
  onLogin,
}: {
  onLogin: (user: { email: string }) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@scsms.go.ke", password: "" },
  });
  const submit = (values: LoginFormValues) => {
    if (
      values.email === "admin@scsms.go.ke" &&
      values.password === "admin123"
    ) {
      onLogin({ email: values.email });
      return;
    }
    setError("Use the demo credentials shown below.");
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
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button className="login-submit" type="submit">
            Sign in <ChevronRight />
          </button>
        </form>
        <div className="login-demo">
          <strong>Demo credentials</strong>
          <span>Email: admin@scsms.go.ke</span>
          <span>Password: admin123</span>
        </div>
        <p className="login-footer">SC-SMS · Education records management</p>
      </div>
    </main>
  );
}

export default LoginPage;
