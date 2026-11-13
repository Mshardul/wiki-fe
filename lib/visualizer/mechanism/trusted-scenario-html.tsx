/**
 * HTML fragments authored in checked-in scenario JSON under `lib/visualizer/<name>/`.
 * Not runtime or user input — same trust boundary as the scenario `run()` output.
 */
export function TrustedScenarioHtml({ html, className }: { html: string; className?: string }) {
  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- checked-in scenario output, not user input
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
