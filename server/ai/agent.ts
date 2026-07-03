import { getLLMService } from "./groq";
import { retrieveRelevantDocuments, buildContextFromSources, calculateConfidence } from "./retriever";
import { SYSTEM_PROMPTS, buildPrompt } from "./prompt";
import { connectDB } from "@/lib/mongoose";
import Conversation from "@/models/Conversation";
import type { AgentState, QueryType } from "@/types";

/**
 * Classify query using Groq
 */
export async function classifyQuery(
  query: string,
  conversationContext?: string
): Promise<QueryType> {
  const prompt = `You are a query classifier. Classify the following user query into exactly one category.

Categories:
- "rag": The user is asking a question that requires searching the knowledge base for specific information.
- "summarize": The user is asking for a summary of a specific document or topic.
- "chat_search": The user is asking about something from a previous conversation.
- "direct": The user is asking a general question, greeting, or something that doesn't need knowledge base search.

${conversationContext ? `Recent conversation context:\n${conversationContext}\n` : ""}

User query: "${query}"

Respond with ONLY the category name (rag, summarize, chat_search, or direct). Nothing else.`;

  const llmService = getLLMService();
  const messages = [
    { role: "system" as const, content: "You are a precise query classifier. Respond with only the category name." },
    { role: "user" as const, content: prompt }
  ];

  const result = await llmService.generateText(messages, {
    temperature: 0.1,
  });

  const classification = result.trim().toLowerCase();
  if (["rag", "summarize", "chat_search", "direct"].includes(classification)) {
    return classification as QueryType;
  }

  return "rag";
}

/**
 * Suggest 3 relevant follow-up questions
 */
export async function generateFollowUpQuestions(
  query: string,
  response: string
): Promise<string[]> {
  try {
    const prompt = buildPrompt(SYSTEM_PROMPTS.followUpQuestions, {
      query,
      response: response.slice(0, 500),
    });

    const llmService = getLLMService();
    const messages = [
      { role: "system" as const, content: "Generate exactly 3 follow-up questions, one per line." },
      { role: "user" as const, content: prompt }
    ];

    const result = await llmService.generateText(messages, {
      temperature: 0.7,
    });

    return result
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 10 && q.endsWith("?"))
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Execute the agent workflow (non-streaming, state graph equivalent)
 */
export async function runAgent({
  query,
  organizationId,
  conversationId,
  conversationHistory = [],
}: {
  query: string;
  organizationId: string;
  conversationId?: string;
  conversationHistory?: { role: string; content: string }[];
}): Promise<AgentState> {
  const state: AgentState = {
    messages: [],
    query,
    queryType: "direct",
    organizationId,
    conversationId,
    retrievedDocs: [],
    context: "",
    response: "",
    sources: [],
    confidence: 0,
    followUpQuestions: [],
  };

  try {
    // Step 1: Classify the query
    const recentContext = conversationHistory
      .slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    state.queryType = await classifyQuery(query, recentContext);

    // Step 2: Route execution
    switch (state.queryType) {
      case "rag":
        await executeRAG(state, conversationHistory);
        break;
      case "summarize":
        await executeSummarize(state);
        break;
      case "chat_search":
        await executeChatSearch(state);
        break;
      case "direct":
        await executeDirect(state, conversationHistory);
        break;
    }

    // Step 3: Suggest follow-up questions
    state.followUpQuestions = await generateFollowUpQuestions(query, state.response);

    return state;
  } catch (error) {
    console.error("Agent execution error:", error);
    state.error = error instanceof Error ? error.message : "Unknown error";
    state.response = "I encountered an error while processing your request. Please try again.";
    state.confidence = 0;
    return state;
  }
}

async function executeRAG(
  state: AgentState, 
  history: { role: string; content: string }[]
): Promise<void> {
  const sources = await retrieveRelevantDocuments({
    organizationId: state.organizationId,
    query: state.query,
    k: 5,
  });

  state.sources = sources;
  state.retrievedDocs = sources;
  state.context = buildContextFromSources(sources);
  state.confidence = calculateConfidence(sources);

  const systemPrompt = buildPrompt(SYSTEM_PROMPTS.rag, {
    context: state.context,
  });

  const llmService = getLLMService();
  state.response = await llmService.generateText(
    [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.role as any, content: h.content })),
      { role: "user", content: state.query }
    ],
    { temperature: 0.3 }
  );
}

async function executeSummarize(state: AgentState): Promise<void> {
  await connectDB();

  const sources = await retrieveRelevantDocuments({
    organizationId: state.organizationId,
    query: state.query,
    k: 8, // More chunks for complete summary context
  });

  if (sources.length === 0) {
    state.response = "I couldn't find any documents matching your request. Please upload documents first.";
    state.confidence = 0.1;
    return;
  }

  state.sources = sources;
  state.context = buildContextFromSources(sources);
  state.confidence = calculateConfidence(sources);

  const systemPrompt = buildPrompt(SYSTEM_PROMPTS.summarize, {
    context: state.context,
  });

  const llmService = getLLMService();
  state.response = await llmService.generateText(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: state.query }
    ],
    { temperature: 0.3 }
  );
}

async function executeChatSearch(state: AgentState): Promise<void> {
  await connectDB();

  const conversations = await Conversation.find({
    organizationId: state.organizationId,
    "messages.content": { 
      $regex: state.query.split(" ").slice(0, 5).join("|"), 
      $options: "i" 
    },
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  if (conversations.length === 0) {
    state.response = "I couldn't find any relevant previous conversations matching your query.";
    state.confidence = 0.2;
    return;
  }

  const contextParts = conversations.map((conv) => {
    const relevantMessages = conv.messages
      .filter((m) =>
        m.content.toLowerCase().includes(state.query.toLowerCase().split(" ")[0])
      )
      .slice(0, 4);

    return `Conversation: "${conv.title}"\n${relevantMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
  });

  state.context = contextParts.join("\n\n---\n\n");
  state.confidence = 0.6;

  const systemPrompt = buildPrompt(SYSTEM_PROMPTS.chatSearch, {
    context: state.context,
  });

  const llmService = getLLMService();
  state.response = await llmService.generateText(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: state.query }
    ],
    { temperature: 0.5 }
  );
}

async function executeDirect(
  state: AgentState,
  history: { role: string; content: string }[]
): Promise<void> {
  const llmService = getLLMService();
  state.response = await llmService.generateText(
    [
      { role: "system", content: SYSTEM_PROMPTS.direct },
      ...history.map(h => ({ role: h.role as any, content: h.content })),
      { role: "user", content: state.query }
    ],
    { temperature: 0.7 }
  );
  state.confidence = 0.9;
}
