import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import DocumentModel from "@/models/Document";
import { deleteDocumentVectors } from "@/lib/ai/vectorstore";
import { reindexDocument } from "@/lib/ai/document-processor";
import Organization from "@/models/Organization";

// GET: Get single document details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const doc = await DocumentModel.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("Document GET error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

// DELETE: Delete a document and its vectors
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete vectors from ChromaDB
    try {
      await deleteDocumentVectors(doc.organizationId.toString(), id);
    } catch (err) {
      console.error("Error deleting vectors:", err);
    }

    // Update org storage
    await Organization.findByIdAndUpdate(doc.organizationId, {
      $inc: { storageUsed: -doc.fileSize },
    });

    // Delete document from MongoDB
    await DocumentModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Document DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

// PATCH: Re-index a document
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Update status to processing
    doc.status = "processing";
    await doc.save();

    // Re-index asynchronously
    reindexDocument(id, doc.organizationId.toString()).catch((err) => {
      console.error("Re-index failed:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Re-indexing started",
    });
  } catch (error) {
    console.error("Document PATCH error:", error);
    return NextResponse.json({ error: "Failed to re-index document" }, { status: 500 });
  }
}
