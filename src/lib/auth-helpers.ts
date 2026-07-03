import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    redirect("/chat");
  }
  return user;
}

export async function requireOrganization() {
  const user = await requireAuth();
  if (!user.organizationId) {
    redirect("/onboarding");
  }
  return user;
}
