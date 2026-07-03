import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";
import { processDocument } from "@/lib/ai/document-processor";

// GET: List documents for an organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 });
    }

    await connectDB();

    // Build filter
    const filter: Record<string, unknown> = { organizationId };
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }
    if (type) {
      filter.type = type;
    }
    if (status) {
      filter.status = status;
    }

    const total = await DocumentModel.countDocuments(filter);
    const documents = await DocumentModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST: Upload a new document
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const organizationId = formData.get("organizationId") as string;
    const userId = formData.get("userId") as string;
    const title = formData.get("title") as string;

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: "organizationId and userId required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    await connectDB();

    // Check org limits
    const org = await Organization.findById(organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const docCount = await DocumentModel.countDocuments({ organizationId });
    if (docCount >= org.settings.maxDocuments) {
      return NextResponse.json(
        { error: "Document limit reached for this organization" },
        { status: 403 }
      );
    }

    // Determine file type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const typeMap: Record<string, string> = {
      pdf: "pdf",
      docx: "docx",
      doc: "docx",
      txt: "txt",
      md: "md",
      markdown: "md",
    };
    const docType = typeMap[ext];
    if (!docType) {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}` },
        { status: 400 }
      );
    }

    // Create document record
    const doc = await DocumentModel.create({
      title: title || file.name.replace(/\.[^/.]+$/, ""),
      type: docType,
      organizationId,
      uploadedBy: userId,
      status: "processing",
      fileSize: file.size,
      originalName: file.name,
    });

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process document asynchronously (don't await)
    processDocument(doc._id.toString(), buffer, docType, organizationId).catch(
      (err) => {
        console.error("Document processing failed:", err);
      }
    );

    return NextResponse.json({
      success: true,
      data: doc,
      message: "Document uploaded and processing started",
    });
  } catch (error) {
    console.error("Documents POST error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
