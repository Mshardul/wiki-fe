export interface Vertical {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  indexPath: string;
  articleCount: number;
}

export interface Heading {
  depth: 2 | 3 | 4;
  text: string;
  id: string;
}

export interface Prerequisite {
  title: string;
  href: string | null;
  level: "Must" | "Should" | null;
}

export interface ShapeFingerprint {
  headings: number;
  codeBlocks: number;
  tables: number;
  paragraphs: number;
}

export interface Article {
  path: string;
  slug: string[];
  verticalId: string;
  title: string;
  headings: Heading[];
  prerequisites: Prerequisite[];
  html: string;
  excerpt: string;
  byteSize: number;
  isStub: boolean;
  shapeFingerprint: ShapeFingerprint;
  readingTimeMin: number;
}

export type ManifestArticle = Omit<Article, "html">;

export interface Manifest {
  generatedAt: string;
  verticals: Vertical[];
  articles: ManifestArticle[];
}

export interface VerticalIndex {
  id: string;
  sections: {
    heading: string;
    articles: { title: string; slug: string[]; path: string; isStub: boolean }[];
  }[];
  learningPaths: {
    track: string;
    rows: { title: string; slug: string[] | null }[];
  }[];
}

export interface BacklinkRef {
  fromPath: string;
  fromTitle: string;
  fromVerticalId: string;
}

export interface RelatedRef {
  path: string;
  title: string;
  slug: string[];
}

export interface RenderContext {
  articlePath: string;
  verticalId: string;
  allArticlePaths: Set<string>;
  glossary: Record<string, string>;
  articleTitle?: string;
  verticalTitle?: string;
}
