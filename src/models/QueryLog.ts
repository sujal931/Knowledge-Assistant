import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQueryLogDoc extends Document {
  query: string;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  responseTime: number;
  documentsUsed: string[];
  confidence: number;
  agentAction: string;
  createdAt: Date;
}

const QueryLogSchema = new Schema<IQueryLogDoc>(
  {
    query: { type: String, required: true },
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
    },
    responseTime: { type: Number, required: true },
    documentsUsed: [{ type: String }],
    confidence: { type: Number, default: 0 },
    agentAction: { type: String, default: "direct" },
  },
  {
    timestamps: true,
  }
);

QueryLogSchema.index({ organizationId: 1, createdAt: -1 });
QueryLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL: 90 days

const QueryLog: Model<IQueryLogDoc> =
  mongoose.models.QueryLog ||
  mongoose.model<IQueryLogDoc>("QueryLog", QueryLogSchema);

export default QueryLog;
