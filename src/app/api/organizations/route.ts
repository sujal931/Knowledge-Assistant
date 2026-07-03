import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongoose";
import Organization from "@/models/Organization";
import User from "@/models/User";
import { generateSlug } from "@/lib/utils";

// POST: Create a new organization / workspace and link the user
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    await connectDB();

    const userId = session.user.id;
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Create the organization
    const org = await Organization.create({
      name: name.trim(),
      slug,
      ownerId: dbUser._id,
      members: [{ userId: dbUser._id, role: "admin", joinedAt: new Date() }],
    });

    // Link the user to the organization and make them admin
    dbUser.organizationId = org._id;
    dbUser.role = "admin";
    await dbUser.save();

    return NextResponse.json({
      success: true,
      data: org,
      message: "Workspace created successfully",
    });
  } catch (error) {
    console.error("Organizations POST error:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}

// GET: Get current user's organization details
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "No organization associated" }, { status: 404 });
    }

    await connectDB();
    const org = await Organization.findById(session.user.organizationId).lean();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    console.error("Organization GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
