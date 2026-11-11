/**
 * HTML fragments authored in checked-in scenario JSON under `lib/visualizer/<name>/`.
 * Not runtime or user input — same trust boundary as the scenario `run()` output.
 */
export function TrustedScenarioHtml({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
