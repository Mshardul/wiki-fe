import { z } from "zod";

const headingSchema = z.object({
  depth: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
  id: z.string(),
});

const prerequisiteSchema = z.object({
  title: z.string(),
  href: z.string().nullable(),
  level: z.union([z.literal("Must"), z.literal("Should")]).nullable(),
});

const shapeFingerprintSchema = z.object({
  headings: z.number().int().nonnegative(),
  codeBlocks: z.number().int().nonnegative(),
  tables: z.number().int().nonnegative(),
  paragraphs: z.number().int().nonnegative(),
});

const verticalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  indexPath: z.string(),
  articleCount: z.number().int().nonnegative(),
});

const manifestArticleSchema = z.object({
  path: z.string(),
  slug: z.array(z.string()),
  verticalId: z.string(),
  title: z.string(),
  headings: z.array(headingSchema),
  prerequisites: z.array(prerequisiteSchema),
  excerpt: z.string(),
  byteSize: z.number().int().nonnegative(),
  isStub: z.boolean(),
  shapeFingerprint: shapeFingerprintSchema,
  readingTimeMin: z.number().int().nonnegative(),
});

export const manifestSchema = z.object({
  generatedAt: z.string(),
  verticals: z.array(verticalSchema),
  articles: z.array(manifestArticleSchema),
});
