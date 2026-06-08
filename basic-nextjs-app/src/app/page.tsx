import Link from "next/link";
import { breeds } from "./breeds/data";

export default function Home() {
  return (
    <div>
      <section className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Get to know the horse
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600 dark:text-stone-400">
          From towering draft horses to pocket-sized ponies, every breed has its
          own story. The Horse Almanac is a simple guide to the many types of
          horses found around the world.
        </p>
        <Link
          href="/breeds"
          className="mt-8 inline-block rounded-full bg-amber-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-800"
        >
          Explore the breeds
        </Link>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-medium">Featured breeds</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {breeds.slice(0, 4).map((breed) => (
            <Link
              key={breed.slug}
              href={`/breeds/${breed.slug}`}
              className="rounded-lg border border-stone-200 p-5 transition-colors hover:border-amber-500 dark:border-stone-800"
            >
              <h3 className="text-lg font-medium">{breed.name}</h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                {breed.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
