"use client";

import { useActionState, useState } from "react";
import { Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Spinner } from "@/components/ui/field";

const initialState: LoginState = { error: null, identifier: "" };

export function LoginForm({ next, denied }: { next?: string; denied?: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const notice = state.error ?? (denied ? "That account does not have administrator access." : null);

  return (
    <form action={formAction} className="w-full space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? "/admin"} />

      {notice ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger-soft px-3.5 py-3 text-[13px] leading-relaxed text-danger-ink"
        >
          <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
          <p>{notice}</p>
        </div>
      ) : null}

      <Field label="Username or email" htmlFor="identifier">
        <Input
          id="identifier"
          name="identifier"
          type="text"
          defaultValue={state.identifier}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="dexter.gravoso"
          required
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={pending}
            className="pr-11"
            aria-invalid={state.error ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {showPassword ? (
              <EyeSlash size={16} weight="regular" aria-hidden="true" />
            ) : (
              <Eye size={16} weight="regular" aria-hidden="true" />
            )}
          </button>
        </div>
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? <Spinner /> : null}
        {pending ? "Signing in" : "Login"}
      </Button>
    </form>
  );
}
