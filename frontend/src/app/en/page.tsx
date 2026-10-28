import { Landing, landingMetadata } from "@/components/landing/Landing";

/** The landing page in English (the header's EN), for readers without Greek. */
export const metadata = landingMetadata("en");

export default function Page() {
  return <Landing lang="en" />;
}
