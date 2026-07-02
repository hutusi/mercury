import { SignOutButton } from "@/components/layout/SignOutButton";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          你好，{user.name || user.email}
        </h1>
        <SignOutButton />
      </div>
      <p className="mt-4 text-slate-500">仪表盘建设中…</p>
    </main>
  );
}
