import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">
          Mercury
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          考试为始，职场为终
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          托业 / 雅思高效备考，配合实战商务英语训练 —— 词汇、阅读、听力、写作、口语、全真模考，一站式提升。
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          免费开始
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          登录
        </Link>
      </div>
    </main>
  );
}
