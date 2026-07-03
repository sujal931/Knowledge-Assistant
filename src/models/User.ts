import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDoc extends Document {
  name: string;
  email: string;
  image?: string;
  emailVerified?: Date;
  role: "admin" | "member";
  organizationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    image: { type: String },
    emailVerified: { type: Date },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>("User", UserSchema);

export default User;
