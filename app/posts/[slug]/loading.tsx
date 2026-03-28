export default function PostLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      {/* Category badges */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-24 bg-bg-high rounded-full" />
        <div className="h-6 w-20 bg-bg-high rounded-full" />
      </div>

      {/* Title */}
      <div className="h-10 bg-bg-high rounded-lg mb-3 w-full" />
      <div className="h-10 bg-bg-high rounded-lg mb-6 w-3/4" />

      {/* Meta */}
      <div className="flex gap-4 mb-8">
        <div className="h-4 w-32 bg-bg-high rounded" />
        <div className="h-4 w-20 bg-bg-high rounded" />
      </div>

      {/* Cover image */}
      <div className="aspect-[2/1] bg-bg-high rounded-lg mb-10" />

      {/* Content lines */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-bg-high rounded"
            style={{ width: `${75 + Math.random() * 25}%` }}
          />
        ))}
      </div>
    </div>
  );
}
