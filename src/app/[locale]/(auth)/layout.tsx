import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold tracking-tight text-brand-600">
        Mercury
      </Link>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
