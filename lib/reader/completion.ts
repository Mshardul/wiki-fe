import { isCompleted, markCompleted, markUncompleted } from "@/lib/storage/completions";
import { showToast } from "@/lib/toast";

export function toggleCompletion(wikiId: string, path: string): boolean {
  if (isCompleted(wikiId, path)) {
    markUncompleted(wikiId, path);
    showToast("Marked as not completed");
    return false;
  }
  markCompleted(wikiId, path);
  showToast("Marked as completed", {
    variant: "success",
    onUndo: () => markUncompleted(wikiId, path),
  });
  return true;
}
