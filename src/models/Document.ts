import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocumentDoc extends Document {
  title: string;
  type: "pdf" | "docx" | "txt" | "md" | "url";
  organizationId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  status: "processing" | "ready" | "error";
  fileSize: number;
  chunkCount: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  originalName?: string;
  url?: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocumentDoc>(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["pdf", "docx", "txt", "md", "url"],
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "ready", "error"],
      default: "processing",
    },
    fileSize: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    originalName: { type: String },
    url: { type: String },
    content: { type: String },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ organizationId: 1, status: 1 });
DocumentSchema.index({ organizationId: 1, createdAt: -1 });

const DocumentModel: Model<IDocumentDoc> =
  mongoose.models.Document ||
  mongoose.model<IDocumentDoc>("Document", DocumentSchema);

export default DocumentModel;
