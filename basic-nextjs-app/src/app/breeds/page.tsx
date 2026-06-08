import Link from "next/link";
import { breeds } from "./data";

export const metadata = {
  title: "Breeds | The Horse Almanac",
};

export default function BreedsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Horse Breeds</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Browse a selection of well-known horse breeds from around the world.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {breeds.map((breed) => (
          <Link
            key={breed.slug}
            href={`/breeds/${breed.slug}`}
            className="rounded-lg border border-stone-200 p-5 transition-colors hover:border-amber-500 dark:border-stone-800"
          >
            <h2 className="text-xl font-medium">{breed.name}</h2>
            <p className="mt-1 text-sm text-stone-500">{breed.origin}</p>
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
              {breed.summary}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
