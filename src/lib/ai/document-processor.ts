import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { addDocuments } from "./vectorstore";
import { connectDB } from "@/lib/mongoose";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";

/**
 * Extract text from different file types
 */
async function extractText(
  buffer: Buffer,
  type: string,
  url?: string
): Promise<string> {
  switch (type) {
    case "pdf": {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text;
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt":
    case "md": {
      return buffer.toString("utf-8");
    }
    case "url": {
      if (!url) throw new Error("URL is required for URL type documents");
      const response = await fetch(url);
      const html = await response.text();
      // Use cheerio to extract text from HTML
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);
      // Remove script and style tags
      $("script, style, nav, footer, header").remove();
      const text = $("body").text();
      return text;
    }
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }
}

/**
 * Clean extracted text
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Remove special characters that mess up embeddings
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Trim
    .trim();
}

/**
 * Split text into chunks using LangChain text splitter
 */
async function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const docs = await splitter.createDocuments([text]);
  return docs.map((doc) => doc.pageContent);
}

/**
 * Process a document through the full ingestion pipeline:
 * Extract → Clean → Chunk → Embed → Store
 */
export async function processDocument(
  documentId: string,
  buffer: Buffer,
  type: string,
  organizationId: string,
  url?: string
): Promise<void> {
  await connectDB();

  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error("Document not found");

  try {
    // Update status to processing
    doc.status = "processing";
    await doc.save();

    // Step 1: Extract text
    const rawText = await extractText(buffer, type, url);

    if (!rawText || rawText.trim().length < 10) {
      throw new Error("No meaningful text could be extracted from the document");
    }

    // Step 2: Clean text
    const cleanedText = cleanText(rawText);

    // Step 3: Chunk text
    const chunks = await chunkText(cleanedText);

    if (chunks.length === 0) {
      throw new Error("Document produced no text chunks");
    }

    // Step 4 & 5: Embed and store (handled by vectorstore)
    const metadatas = chunks.map((_, index) => ({
      documentId,
      documentTitle: doc.title,
      organizationId,
      chunkIndex: index,
      totalChunks: chunks.length,
      type: doc.type,
    }));

    await addDocuments({
      organizationId,
      documentId,
      chunks,
      metadatas,
    });

    // Update document status
    doc.status = "ready";
    doc.chunkCount = chunks.length;
    doc.content = cleanedText.slice(0, 5000); // Store first 5000 chars for preview
    await doc.save();

    // Update org storage
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { storageUsed: doc.fileSize },
    });

    console.log(
      `Document ${documentId} processed: ${chunks.length} chunks created`
    );
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);

    doc.status = "error";
    doc.errorMessage =
      error instanceof Error ? error.message : "Unknown error during processing";
    await doc.save();

    throw error;
  }
}

/**
 * Re-index an existing document
 */
export async function reindexDocument(
  documentId: string,
  organizationId: string
): Promise<void> {
  const { deleteDocumentVectors } = await import("./vectorstore");

  // Delete existing vectors
  await deleteDocumentVectors(organizationId, documentId);

  // Get document from DB
  await connectDB();
  const doc = await DocumentModel.findById(documentId);
  if (!doc) throw new Error("Document not found");

  // Re-process (we need the original content)
  if (!doc.content) {
    throw new Error("Original content not available for re-indexing");
  }

  const cleanedText = cleanText(doc.content);
  const chunks = await chunkText(cleanedText);

  const metadatas = chunks.map((_, index) => ({
    documentId,
    documentTitle: doc.title,
    organizationId,
    chunkIndex: index,
    totalChunks: chunks.length,
    type: doc.type,
  }));

  await addDocuments({
    organizationId,
    documentId,
    chunks,
    metadatas,
  });

  doc.status = "ready";
  doc.chunkCount = chunks.length;
  await doc.save();
}
