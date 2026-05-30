import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMedia, generateStaticParams } from "./getMedia";
import MovieView from "./MovieView";
import SeriesView from "./SeriesView";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;
export { generateStaticParams };

// Definir el tipo correcto para params en Next.js 14
interface MediaPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MediaPage({ params }: MediaPageProps) {
  // Desenvolver la Promise params
  const { slug } = await params;
  const media = getMedia(slug);

  if (!media) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <Button asChild variant="outline">
          <Link href="/" className="inline-flex items-center gap-2">
            <span>Back to Catalog</span>
          </Link>
        </Button>
      </header>

      <main className="max-w-6xl mx-auto">
        {media.type === "movie" ? (
          <MovieView media={media} />
        ) : (
          <SeriesView media={media} />
        )}
      </main>
    </div>
  );
}