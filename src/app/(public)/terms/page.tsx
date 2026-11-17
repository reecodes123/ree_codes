/**
 * 60-second ISR — see the (public) layout's note. Dashboard edits appear
 * immediately anyway: the Terms mutation route calls revalidatePath("/terms").
 */
export const revalidate = 60;

import type { Metadata } from "next";
import { TermsContent } from "@/components/public/TermsContent";
import { getTermsPage } from "@/server/repositories/termsPage";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Usage terms, content policy, and legal disclaimers for The Matrix Today.",
};

export default async function TermsPage() {
  const page = await getTermsPage();
  return <TermsContent page={page} />;
}
