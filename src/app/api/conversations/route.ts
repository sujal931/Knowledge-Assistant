import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Conversation from "@/models/Conversation";

// GET: List conversations for a user/organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const userId = searchParams.get("userId");

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: "organizationId and userId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const conversations = await Conversation.find({
      organizationId,
      userId,
    })
      .select("title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()
      .then((convs) =>
        convs.map((c) => ({
          ...c,
          messageCount: c.messages?.length || 0,
          lastMessage: c.messages?.[c.messages.length - 1]?.content?.slice(0, 100),
          messages: undefined,
        }))
      );

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error("Conversations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a conversation
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await connectDB();
    await Conversation.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Conversation deleted",
    });
  } catch (error) {
    console.error("Conversation DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
