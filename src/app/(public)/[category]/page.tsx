/**
 * 60-second ISR — see the (public) layout's note. Category pages not yet in
 * the cache render on demand (empty generateStaticParams, dynamicParams
 * defaults to true) and are then cached.
 *
 * Replaces what used to be six near-identical hardcoded route files
 * (news/, features/, editorials/, literary/, sports/, announcements/), one
 * per category. That meant adding a category from the dashboard didn't
 * actually get it a working listing page or nav entry — this single dynamic
 * route reads the Category table directly, so a new category just works.
 *
 * Next.js always resolves a static route (e.g. /about, /login) before
 * falling through to this dynamic segment, so existing static public pages
 * are unaffected — see categories.ts's RESERVED_SLUGS for the one thing to
 * know about that boundary.
 */
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/public/CategoryListing";
import { listPublishedArticles } from "@/server/repositories/articles";
import { getCategoryBySlug } from "@/server/repositories/categories";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? undefined,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { items } = await listPublishedArticles({ category: slug, pageSize: 60 });

  return (
    <CategoryListing
      title={category.name}
      description={category.description ?? ""}
      articles={items}
    />
  );
}
