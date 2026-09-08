// Password policy — mirrors wiki-be. Values copied verbatim from js/auth.js PW_RULES.
// Keep in sync with docs/_meta/auth.md (Password policy). WIKI-634: the special-char test
// currently also passes whitespace; tightened there, not here, to stay a faithful port.

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PW_RULES: readonly PasswordRule[] = [
  { id: "len", label: "At least 12 characters", test: (p) => p.length >= 12 },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "A number (0–9)", test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "A special character ( ! @ # $ % ^ & * ? - _ )",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export interface PasswordValidation {
  valid: boolean;
  rules: { id: string; label: string; ok: boolean }[];
}

export function validatePassword(pw: string): PasswordValidation {
  const rules = PW_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(pw) }));
  return { valid: rules.every((r) => r.ok), rules };
}
