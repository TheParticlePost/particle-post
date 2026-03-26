import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-8">
        <Link href="/" className="text-2xl font-heading font-bold tracking-tight">
          <span className="gradient-text">Particle Post</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
