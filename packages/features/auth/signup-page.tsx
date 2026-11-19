"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, School } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signupSchema } from "../schemas/signup-schema";
import type { SignupOptions, SignupValues } from "./login-page";

const formSchema = signupSchema.extend({ confirmPassword: z.string() }).refine(
  (values) => values.password === values.confirmPassword,
  { path: ["confirmPassword"], message: "Passwords do not match." },
);
type FormValues = z.input<typeof formSchema>;

export function SignupPage({ loadOptions, signup, onBack, onSuccess }: {
  loadOptions: () => Promise<SignupOptions>;
  signup: (values: SignupValues) => Promise<void>;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", phone: "", subcountyId: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let cancelled = false;
    setOptions(null);
    setOptionsError("");
    loadOptions().then((data) => {
      if (!cancelled) {
        setOptions(data);
      }
    }).catch((error: unknown) => {
      if (!cancelled) setOptionsError(error instanceof Error ? error.message : "Unable to load the available options.");
    });
    return () => { cancelled = true; };
  }, [loadOptions, attempt]);

  const ready = !!options?.subcounties.length;
  return (
    <main className="login-shell signup-shell">
      <div className="login-card signup-card">
        <div className="signup-header">
          <div className="login-brand"><span className="login-brand-mark"><School /></span><div><strong>SC-SMS</strong><small>Sub-County Education Office</small></div></div>
          <button className="signup-back" type="button" onClick={onBack}><ArrowLeft /> Sign in</button>
        </div>
        <div className="signup-heading"><span className="eyebrow">Get started</span><h1>Create your account</h1><p>Enter your details and select where you work to request access.</p></div>
        <form className="signup-form" noValidate onSubmit={handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
          setSubmitError("");
          try { await signup(values); onSuccess(); } catch (error) { setSubmitError(error instanceof Error ? error.message : "Unable to create your account."); }
        })}>
          <section className="signup-section"><div className="signup-section-heading"><span>01</span><div><h2>Personal details</h2><p>Tell us how to identify and contact you.</p></div></div>
            <div className="signup-grid">
              <label className="signup-full">Full name<div className="login-input"><input {...register("name")} autoComplete="name" placeholder="e.g. Jane Wanjiku" aria-invalid={!!errors.name} /></div>{errors.name && <small className="signup-field-error">Enter your full name.</small>}</label>
              <label>Email address<div className="login-input"><input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} /></div>{errors.email && <small className="signup-field-error">Enter a valid email address.</small>}</label>
              <label>Phone number <span className="signup-optional">Optional</span><div className="login-input"><input {...register("phone")} type="tel" autoComplete="tel" placeholder="e.g. 0712 345 678" aria-invalid={!!errors.phone} /></div>{errors.phone && <small className="signup-field-error">Enter a phone number under 40 characters.</small>}</label>
            </div>
          </section>
          <section className="signup-section"><div className="signup-section-heading"><span>02</span><div><h2>Work assignment</h2><p>Select your subcounty.</p></div></div>
            <div className="signup-grid">
              <label>Subcounty<div className="login-input"><select {...register("subcountyId")} disabled={!options} aria-invalid={!!errors.subcountyId}><option value="">{options ? "Select a subcounty" : "Loading subcounties..."}</option>{options?.subcounties.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div>{errors.subcountyId && <small className="signup-field-error">Select a subcounty.</small>}</label>
            </div>
            {optionsError && <p className="signup-field-error" role="alert">{optionsError} <button type="button" className="signup-retry" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p>}
            {options && !ready && <p className="signup-field-error" role="alert">No active subcounties are available. Contact an administrator.</p>}
          </section>
          <section className="signup-section"><div className="signup-section-heading"><span>03</span><div><h2>Secure your account</h2><p>Use a password of at least 8 characters and no more than 72 bytes.</p></div></div>
            <div className="signup-grid">
              <label>Password<div className="login-input"><LockKeyhole /><input {...register("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" aria-invalid={!!errors.password} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>{showPassword ? <EyeOff /> : <Eye />}</button></div>{errors.password && <small className="signup-field-error">Use at least 8 characters and at most 72 bytes.</small>}</label>
              <label>Confirm password<div className="login-input"><input {...register("confirmPassword")} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" aria-invalid={!!errors.confirmPassword} /></div>{errors.confirmPassword && <small className="signup-field-error">{errors.confirmPassword.message}</small>}</label>
            </div>
          </section>
          {submitError && <p className="signup-field-error" role="alert">{submitError}</p>}
          <div className="signup-actions"><p>Already have an account? <button type="button" onClick={onBack}>Sign in</button></p><button className="login-submit" type="submit" disabled={isSubmitting || !ready}>{isSubmitting ? "Creating account..." : "Create account"}<ArrowRight /></button></div>
        </form>
      </div>
    </main>
  );
}
