import { connectDB } from "@/lib/mongoose";
import Conversation from "@/models/Conversation";
import QueryLog from "@/models/QueryLog";
import { 
  getLLMService, 
  SYSTEM_PROMPTS, 
  buildPrompt, 
  retrieveRelevantDocuments, 
  buildContextFromSources, 
  calculateConfidence, 
  classifyQuery 
} from "@server/ai";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, conversationId, organizationId, userId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0 || !organizationId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const message = lastMessage?.content;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message content cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await connectDB();

    const startTime = Date.now();

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        organizationId,
        userId,
        messages: [],
      });
    }

    // Save user message
    conversation.messages.push({
      id: uuid(),
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    await conversation.save();

    // Get conversation history for context
    const conversationHistory = conversation.messages
      .slice(-10)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

    // Classify the query
    const recentContext = conversationHistory
      .slice(-4)
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");
    const queryType = await classifyQuery(message, recentContext);

    // For RAG and summarize queries, retrieve context first
    let systemPrompt = SYSTEM_PROMPTS.direct;
    let sources: Awaited<ReturnType<typeof retrieveRelevantDocuments>> = [];
    let confidence = 0.9;

    if (queryType === "rag" || queryType === "summarize") {
      sources = await retrieveRelevantDocuments({
        organizationId,
        query: message,
        k: queryType === "summarize" ? 8 : 5,
      });

      const context = buildContextFromSources(sources);
      confidence = calculateConfidence(sources);

      systemPrompt = buildPrompt(
        queryType === "summarize" ? SYSTEM_PROMPTS.summarize : SYSTEM_PROMPTS.rag,
        { context }
      );
    } else if (queryType === "chat_search") {
      // Search previous conversations
      const prevConversations = await Conversation.find({
        organizationId,
        _id: { $ne: conversation._id },
        "messages.content": { $regex: message.split(" ").slice(0, 3).join("|"), $options: "i" },
      })
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();

      const chatContext = prevConversations
        .map((c) => {
          const msgs = c.messages.slice(-4).map((m) => `${m.role}: ${m.content}`).join("\n");
          return `Conversation "${c.title}":\n${msgs}`;
        })
        .join("\n\n---\n\n");

      systemPrompt = buildPrompt(SYSTEM_PROMPTS.chatSearch, { context: chatContext });
      confidence = 0.6;
    }

    // Build messages for streaming
    const aiMessages = conversationHistory
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Build messages for Groq
    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...aiMessages,
    ];

    // Stream the response using the Groq LLM service
    const llmService = getLLMService();
    const responseStream = await llmService.streamText(fullMessages, {
      temperature: queryType === "direct" ? 0.7 : 0.3,
      maxTokens: 4096,
      async onFinish(text) {
        try {
          // Generate follow-up questions
          let followUpQuestions: string[] = [];
          try {
            const { generateFollowUpQuestions } = await import("@server/ai");
            followUpQuestions = await generateFollowUpQuestions(message, text);
          } catch (err) {
            console.error("Error generating follow-ups:", err);
          }

          // Save assistant message
          conversation.messages.push({
            id: uuid(),
            role: "assistant",
            content: text,
            sources: sources.map((s) => ({
              documentId: s.documentId,
              documentTitle: s.documentTitle,
              chunkContent: s.chunkContent.slice(0, 300),
              score: s.score,
              page: s.page,
            })),
            confidence,
            followUpQuestions,
            agentAction: queryType,
            timestamp: new Date(),
          });
          await conversation.save();

          // Log query for analytics
          const responseTime = Date.now() - startTime;
          await QueryLog.create({
            query: message,
            organizationId,
            userId,
            responseTime,
            documentsUsed: sources.map((s) => s.documentId),
            confidence,
            agentAction: queryType,
          });
        } catch (err) {
          console.error("Error saving conversation:", err);
        }
      },
    });

    // Add custom headers for metadata
    const headers = new Headers();
    headers.set("Content-Type", "text/plain; charset=utf-8");
    headers.set("x-vercel-ai-data-stream", "v1");
    headers.set("X-Conversation-Id", conversation._id.toString());
    headers.set("X-Query-Type", queryType);
    headers.set("X-Confidence", confidence.toString());
    headers.set(
      "X-Sources",
      JSON.stringify(
        sources.slice(0, 5).map((s) => ({
          documentId: s.documentId,
          documentTitle: s.documentTitle,
          chunkContent: s.chunkContent.slice(0, 200),
          score: s.score,
        }))
      )
    );

    return new Response(responseStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
