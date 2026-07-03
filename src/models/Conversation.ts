import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessageDoc {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: {
    documentId: string;
    documentTitle: string;
    chunkContent: string;
    score: number;
    page?: number;
    metadata?: Record<string, unknown>;
  }[];
  confidence?: number;
  followUpQuestions?: string[];
  agentAction?: string;
  timestamp: Date;
}

export interface IConversationDoc extends Document {
  title: string;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  messages: IChatMessageDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessageDoc>(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    sources: [
      {
        documentId: String,
        documentTitle: String,
        chunkContent: String,
        score: Number,
        page: Number,
        metadata: Schema.Types.Mixed,
      },
    ],
    confidence: { type: Number },
    followUpQuestions: [String],
    agentAction: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversationDoc>(
  {
    title: { type: String, default: "New Conversation" },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: [ChatMessageSchema],
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ organizationId: 1, createdAt: -1 });

const Conversation: Model<IConversationDoc> =
  mongoose.models.Conversation ||
  mongoose.model<IConversationDoc>("Conversation", ConversationSchema);

export default Conversation;
