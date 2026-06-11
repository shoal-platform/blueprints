import Link from "next/link";
import { notFound } from "next/navigation";
import { breeds, getBreed } from "../data";

export function generateStaticParams() {
  return breeds.map((breed) => ({ slug: breed.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const breed = getBreed(slug);
  return {
    title: breed ? `${breed.name} | The Horse Almanac` : "Breed not found",
  };
}

export default async function BreedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const breed = getBreed(slug);
  if (!breed) notFound();

  return (
    <article>
      <Link href="/breeds" className="text-sm text-amber-700 hover:underline">
        ← All breeds
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{breed.name}</h1>
      <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">
        {breed.summary}
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
          <dt className="text-xs uppercase tracking-wide text-stone-500">Origin</dt>
          <dd className="mt-1 font-medium">{breed.origin}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
          <dt className="text-xs uppercase tracking-wide text-stone-500">Height</dt>
          <dd className="mt-1 font-medium">{breed.height}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
          <dt className="text-xs uppercase tracking-wide text-stone-500">
            Temperament
          </dt>
          <dd className="mt-1 font-medium">{breed.temperament}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-xl font-medium">Good to know</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700 dark:text-stone-300">
        {breed.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </article>
  );
}
