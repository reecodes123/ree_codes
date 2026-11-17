/**
 * 60-second ISR for the whole public site (this layout's `revalidate` is the
 * default for every public page under it).
 *
 * Previously `force-dynamic`: every click re-rendered on the server and
 * waited on fresh DB queries, which is what made public navigation feel slow.
 * With ISR, pages are served instantly from Vercel's cache and re-generated
 * in the background at most once a minute — and dashboard edits don't even
 * wait that long, because every mutating API route already calls
 * `revalidatePath()` for the pages it affects.
 *
 * The old concern that `next build` can't reach the database no longer
 * applies: the cloud Postgres (Neon/Prisma Postgres) is reachable from
 * Vercel's build container, so prerendering at build works.
 */
export const revalidate = 60;

import { Header } from "@/components/public/Header";
import { Navigation } from "@/components/public/Navigation";
import { Footer } from "@/components/public/Footer";
import { ScrollToTop } from "@/components/public/ScrollToTop";
import { VisitTracker } from "@/components/public/VisitTracker";
import { PrivacyNotice } from "@/components/public/PrivacyNotice";
import { TermsAcceptanceBanner } from "@/components/public/TermsAcceptanceBanner";
import { getSettings } from "@/server/repositories/settings";
import { getTermsPage } from "@/server/repositories/termsPage";
import { listCategories } from "@/server/repositories/categories";

/**
 * Public site shell.
 *
 * Everything in the (public) route group renders inside this. The parentheses
 * make it a *route group*: it organises files without adding "/public" to any
 * URL, so /news stays /news.
 *
 * Settings are fetched once here and fanned out to Header/Footer/Navigation
 * (which forwards to SettingsPanel) so branding — site name, logo, tagline,
 * social links, footer text — reflects what's saved in the dashboard instead
 * of being hardcoded per-component. getSettings() already falls back to
 * DEFAULT_SETTINGS if the row is missing, so a DB hiccup degrades gracefully
 * instead of crashing every public page.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, terms, categories] = await Promise.all([
    getSettings(),
    getTermsPage(),
    listCategories(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-tmt-cream">
      <Header settings={settings} />
      <Navigation settings={settings} categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <ScrollToTop />
      <VisitTracker />
      <PrivacyNotice />
      <TermsAcceptanceBanner version={terms.version} />
    </div>
  );
}
