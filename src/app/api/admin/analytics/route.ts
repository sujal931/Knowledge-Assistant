import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import QueryLog from "@/models/QueryLog";
import DocumentModel from "@/models/Document";
import Organization from "@/models/Organization";

// GET: Dashboard analytics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Total documents
    const totalDocuments = await DocumentModel.countDocuments({
      organizationId,
      status: "ready",
    });

    // Total queries
    const totalQueries = await QueryLog.countDocuments({ organizationId });

    // Average response time
    const avgResponseResult = await QueryLog.aggregate([
      { $match: { organizationId } },
      { $group: { _id: null, avgTime: { $avg: "$responseTime" } } },
    ]);
    const avgResponseTime = avgResponseResult[0]?.avgTime || 0;

    // Organization storage
    const org = await Organization.findById(organizationId)
      .select("storageUsed maxStorage")
      .lean();

    // Queries over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const queriesOverTime = await QueryLog.aggregate([
      {
        $match: {
          organizationId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Popular documents
    const popularDocs = await QueryLog.aggregate([
      { $match: { organizationId } },
      { $unwind: "$documentsUsed" },
      { $group: { _id: "$documentsUsed", queryCount: { $sum: 1 } } },
      { $sort: { queryCount: -1 } },
      { $limit: 10 },
    ]);

    // Get document titles
    const docIds = popularDocs.map((d) => d._id);
    const docs = await DocumentModel.find({ _id: { $in: docIds } })
      .select("title")
      .lean();
    const docTitleMap = new Map(docs.map((d) => [d._id.toString(), d.title]));

    const popularDocuments = popularDocs.map((d) => ({
      title: docTitleMap.get(d._id) || "Unknown",
      queryCount: d.queryCount,
    }));

    // Response latency distribution
    const latencyDist = await QueryLog.aggregate([
      { $match: { organizationId } },
      {
        $bucket: {
          groupBy: "$responseTime",
          boundaries: [0, 1000, 2000, 3000, 5000, 10000, Infinity],
          default: "10000+",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const latencyLabels: Record<string, string> = {
      "0": "0-1s",
      "1000": "1-2s",
      "2000": "2-3s",
      "3000": "3-5s",
      "5000": "5-10s",
      "10000+": "10s+",
    };

    const responseLatency = latencyDist.map((d) => ({
      range: latencyLabels[d._id.toString()] || `${d._id}ms+`,
      count: d.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalDocuments,
        totalQueries,
        avgResponseTime: Math.round(avgResponseTime),
        storageUsed: org?.storageUsed || 0,
        storageLimit: org?.maxStorage || 0,
        queriesOverTime: queriesOverTime.map((q) => ({
          date: q._id,
          count: q.count,
        })),
        popularDocuments,
        responseLatency,
      },
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
