import SubtitleMerger from "./SubtitleMerger";
import { ToolPageShell, generatePageMetadata } from "@/app/lib/toolPageShell";

export const generateMetadata = generatePageMetadata("subtitleMerger");

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <ToolPageShell toolKey="subtitleMerger" locale={locale}>
      <SubtitleMerger />
    </ToolPageShell>
  );
}
