export default function PulseLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-bg-base py-20 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="h-4 w-32 bg-bg-high rounded mb-4" />
          <div className="h-12 w-64 bg-bg-high rounded mb-4" />
          <div className="h-6 w-96 bg-bg-high rounded mb-12" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-bg-container border border-border-ghost rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Map skeleton */}
      <div className="bg-bg-low py-20 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="h-4 w-32 bg-bg-high rounded mb-4" />
          <div className="h-8 w-64 bg-bg-high rounded mb-10" />
          <div className="h-[400px] bg-bg-container border border-border-ghost rounded-lg" />
        </div>
      </div>
    </div>
  );
}
