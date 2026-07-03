import { getLLMService } from "./groq";
import { retrieveRelevantDocuments, buildContextFromSources, calculateConfidence } from "./retriever";
import { SYSTEM_PROMPTS, buildPrompt } from "./prompt";
import type { ISource } from "@/types";

export interface RAGRequest {
  query: string;
  organizationId: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  stream?: boolean;
  onFinish?: (text: string) => Promise<void> | void;
}

export interface RAGResponse {
  response: string | ReadableStream<Uint8Array>;
  sources: ISource[];
  confidence: number;
}

/**
 * Execute the complete RAG pipeline
 */
export async function runRAG({
  query,
  organizationId,
  conversationHistory = [],
  stream = false,
  onFinish,
}: RAGRequest): Promise<RAGResponse> {
  // Step 1, 2 & 3: Generate embedding, query vector store, and retrieve top relevant chunks
  const sources = await retrieveRelevantDocuments({
    organizationId,
    query,
    k: 5,
  });

  const context = buildContextFromSources(sources);
  const confidence = calculateConfidence(sources);

  // Step 4: Build prompt with retrieved context
  const systemPrompt = buildPrompt(SYSTEM_PROMPTS.rag, { context });
  const llmService = getLLMService();

  // Construct LLM message format with prompt and context
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: query },
  ];

  // Step 5: Send prompt to Groq (openai/gpt-oss-120b)
  if (stream) {
    const responseStream = await llmService.streamText(messages, {
      temperature: 0.3,
      onFinish,
    });
    return {
      response: responseStream,
      sources,
      confidence,
    };
  } else {
    const textResponse = await llmService.generateText(messages, {
      temperature: 0.3,
    });
    if (onFinish) {
      await onFinish(textResponse);
    }
    return {
      response: textResponse,
      sources,
      confidence,
    };
  }
}
