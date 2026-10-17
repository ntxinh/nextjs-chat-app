import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/policies/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
