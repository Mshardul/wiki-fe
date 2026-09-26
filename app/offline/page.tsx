import { OfflineShelf, type ShelfArticleMeta } from "@/components/pwa/OfflineShelf";
import { BASE_PATH } from "@/lib/config";
import { getManifest } from "@/lib/content";

export const metadata = { title: "Offline shelf" };

export default async function Offline() {
  const manifest = await getManifest();
  const verticalTitle = new Map(manifest.verticals.map((v) => [v.id, v.title]));
  const articles: ShelfArticleMeta[] = manifest.articles
    .filter((a) => !a.isStub)
    .map((a) => ({
      route: `${BASE_PATH}/${a.verticalId}/${a.slug.join("/")}/`,
      title: a.title,
      verticalId: a.verticalId,
      verticalTitle: verticalTitle.get(a.verticalId) ?? a.verticalId,
    }));

  return <OfflineShelf articles={articles} />;
}
