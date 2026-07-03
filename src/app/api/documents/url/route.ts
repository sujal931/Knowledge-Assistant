import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import DocumentModel from "@/models/Document";
import { processDocument } from "@/lib/ai/document-processor";

// POST: Ingest a document from a URL
export async function POST(req: NextRequest) {
  try {
    const { url, organizationId, userId, title } = await req.json();

    if (!url || !organizationId || !userId) {
      return NextResponse.json(
        { error: "url, organizationId, and userId required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    await connectDB();

    // Create document record
    const doc = await DocumentModel.create({
      title: title || new URL(url).hostname + new URL(url).pathname,
      type: "url",
      organizationId,
      uploadedBy: userId,
      status: "processing",
      fileSize: 0,
      url,
    });

    // Process URL asynchronously
    processDocument(
      doc._id.toString(),
      Buffer.from(""),
      "url",
      organizationId,
      url
    ).catch((err) => {
      console.error("URL processing failed:", err);
    });

    return NextResponse.json({
      success: true,
      data: doc,
      message: "URL ingestion started",
    });
  } catch (error) {
    console.error("URL ingest error:", error);
    return NextResponse.json(
      { error: "Failed to ingest URL" },
      { status: 500 }
    );
  }
}
