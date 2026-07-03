import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChatPageClient from "@/components/chat/ChatPageClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ChatPageClient
      organizationId={session.user.organizationId || ""}
      userId={session.user.id}
    />
  );
}
