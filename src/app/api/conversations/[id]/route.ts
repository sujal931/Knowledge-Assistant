import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Conversation from "@/models/Conversation";

// GET: Get a single conversation with all messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    console.error("Conversation GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PUT: Update conversation title
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    await connectDB();

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      { title },
      { new: true }
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    console.error("Conversation PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
