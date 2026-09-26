export type AuthPanel = "login" | "register" | "verify" | "forgot" | "reset" | "verify-result";

type OpenFn = (panel: AuthPanel, token?: string) => void;
let opener: OpenFn | null = null;

export function registerAuthModal(fn: OpenFn): () => void {
  opener = fn;
  return () => {
    if (opener === fn) opener = null;
  };
}

export function openAuthModal(panel: AuthPanel = "login", token?: string): void {
  opener?.(panel, token);
}
