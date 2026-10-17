import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/lib/query/provider";
import { requireUser } from "@/server/policies/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
