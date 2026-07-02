import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
