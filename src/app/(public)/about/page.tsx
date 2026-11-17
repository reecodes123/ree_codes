/**
 * 60-second ISR — see the (public) layout's note. Dashboard edits appear
 * immediately anyway: the About mutation route calls revalidatePath("/about").
 */
export const revalidate = 60;

import type { Metadata } from "next";
import { AboutContent } from "@/components/public/AboutContent";
import { getAboutPage } from "@/server/repositories/aboutPage";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "The official student publication of Marinduque State University — College of Engineering.",
};

export default async function AboutPage() {
  const page = await getAboutPage();
  return <AboutContent page={page} />;
}
