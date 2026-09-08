"use client";

import { validatePassword } from "@/lib/auth/passwordRules";

// Live 5-rule password checklist. Ported from js/auth.js AuthModal._renderChecklist.
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  const { rules } = validatePassword(password);
  return (
    <ul id={id} className="auth-pw-checklist">
      {rules.map((r) => (
        <li key={r.id} className={r.ok ? "ok" : ""}>
          {r.label}
          <span className="visually-hidden">{r.ok ? " — met" : " — not met"}</span>
        </li>
      ))}
    </ul>
  );
}
