import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrgMemberDoc {
  userId: mongoose.Types.ObjectId;
  role: "admin" | "member";
  joinedAt: Date;
}

export interface IOrganizationDoc extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  members: IOrgMemberDoc[];
  settings: {
    maxDocuments: number;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  storageUsed: number;
  maxStorage: number;
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

const OrgMemberSchema = new Schema<IOrgMemberDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrganizationSchema = new Schema<IOrganizationDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [OrgMemberSchema],
    settings: {
      maxDocuments: { type: Number, default: 500 },
      maxFileSize: { type: Number, default: 50 * 1024 * 1024 }, // 50MB
      allowedFileTypes: {
        type: [String],
        default: ["pdf", "docx", "txt", "md", "url"],
      },
    },
    storageUsed: { type: Number, default: 0 },
    maxStorage: { type: Number, default: 1024 * 1024 * 1024 }, // 1GB
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
  },
  {
    timestamps: true,
  }
);

const Organization: Model<IOrganizationDoc> =
  mongoose.models.Organization ||
  mongoose.model<IOrganizationDoc>("Organization", OrganizationSchema);

export default Organization;
