import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center space-y-6 max-w-lg">
        <p className="text-accent font-mono text-body-sm tracking-widest uppercase">
          Error 404
        </p>
        <h1 className="font-display text-display-lg">Page not found</h1>
        <p className="text-text-secondary text-body-lg">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg
                     bg-accent text-[#0a0a0f] font-medium text-body-md
                     hover:bg-accent-hover transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}
