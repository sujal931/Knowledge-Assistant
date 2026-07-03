import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import Conversation from "@/models/Conversation";
import ChatPageClient from "@/components/chat/ChatPageClient";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { conversationId } = await params;

  await connectDB();
  const conversation = await Conversation.findById(conversationId).lean();

  if (!conversation) {
    redirect("/chat");
  }

  const initialMessages = (conversation.messages || []).map(
    (m: { id: string; role: string; content: string }) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );

  return (
    <ChatPageClient
      organizationId={session.user.organizationId || ""}
      userId={session.user.id}
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
