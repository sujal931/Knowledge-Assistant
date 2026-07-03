import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DocumentsPageClient from "@/components/documents/DocumentsPageClient";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DocumentsPageClient
      organizationId={session.user.organizationId || ""}
      userId={session.user.id}
    />
  );
}
