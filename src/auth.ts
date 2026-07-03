import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import Organization from "@/models/Organization";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        await connectDB();

        // Find user in database (auto-created by MongoDB adapter on first sign-in)
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          // If a new user was created but doesn't have an organization workspace yet, initialize one
          if (!dbUser.organizationId) {
            const org = await Organization.create({
              name: `${dbUser.name}'s Workspace`,
              slug: `${dbUser.email.split("@")[0]}-workspace`,
              ownerId: dbUser._id,
              members: [{ userId: dbUser._id, role: "admin", joinedAt: new Date() }],
            });

            dbUser.organizationId = org._id;
            dbUser.role = "admin"; // First user becomes admin of their workspace
            await dbUser.save();
          }

          token.userId = dbUser._id.toString();
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId?.toString();
        }
      }

      // Allow session updates to refresh org info
      if (trigger === "update") {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId?.toString();
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string | undefined;
      }
      return session;
    },
  },
});

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: string;
      organizationId?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    organizationId?: string;
  }
}
