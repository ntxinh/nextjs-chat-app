import "server-only";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { type AuthUser, auth } from "@/lib/auth";
import { AppError } from "@/lib/errors/app-error";
import { getLogger } from "@/lib/logging/request-context";
import { touchLastSeen } from "@/server/services/presence";

async function getSessionUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.deletedAt) return null;
  // Fire-and-forget presence touch — throttled inside; failure must not slow
  // or break the request.
  touchLastSeen(session.user.id).catch((e) => getLogger().warn({ err: e }, "touchLastSeen failed"));
  return session.user;
}

/** RSC/page gate: redirects to /login (locale-aware) when unauthenticated. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (user) return user;
  return redirect({ href: "/login", locale: await getLocale() });
}

/** API gate: throws instead of redirecting. */
export async function requireApiUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError(401, "unauthorized", "Authentication required");
  return user;
}
