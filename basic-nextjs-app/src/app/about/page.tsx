export const metadata = {
  title: "About | The Horse Almanac",
};

export default function AboutPage() {
  return (
    <div className="prose-stone">
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <p className="mt-4 text-stone-700 dark:text-stone-300">
        The Horse Almanac is a small sample site built to showcase a few
        different types of horses. Each breed page covers where the horse comes
        from, its typical size and temperament, and a handful of facts worth
        knowing.
      </p>
      <p className="mt-4 text-stone-700 dark:text-stone-300">
        It is intentionally simple, a starting point you can expand with more
        breeds, photos, or care guides.
      </p>
    </div>
  );
}
