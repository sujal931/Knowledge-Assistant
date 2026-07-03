import Groq from "groq-sdk";
import logger from "@/lib/logger";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMService {
  generateText(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<string>;
  
  streamText(
    messages: ChatMessage[],
    options?: LLMOptions & {
      onFinish?: (text: string) => Promise<void> | void;
    }
  ): Promise<ReadableStream<Uint8Array>>;
}

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not defined");
    }
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

export class GroqLLMService implements ILLMService {
  private client: Groq;
  private defaultModel: string;

  constructor() {
    this.client = getGroqClient();
    this.defaultModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }

  /**
   * Helper to execute API calls with exponential backoff retry and latency logging
   */
  private async executeWithRetryAndLogging<T>(
    operationName: string,
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        logger.info(
          { 
            operation: operationName, 
            durationMs: duration, 
            attempt: attempt + 1,
            model: this.defaultModel 
          }, 
          `${operationName} completed successfully`
        );
        return result;
      } catch (error) {
        attempt++;
        const duration = Date.now() - startTime;
        logger.error(
          { 
            operation: operationName, 
            durationMs: duration, 
            attempt, 
            error: error instanceof Error ? error.message : error 
          },
          `${operationName} attempt ${attempt} failed`
        );
        
        if (attempt >= retries) {
          throw error;
        }
        
        // Exponential backoff delay
        await new Promise((resolve) => 
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }
    throw new Error(`${operationName} failed after ${retries} attempts`);
  }

  async generateText(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<string> {
    return this.executeWithRetryAndLogging("GroqLLMService.generateText", async () => {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 2048,
      });
      return response.choices[0]?.message?.content || "";
    });
  }

  async streamText(
    messages: ChatMessage[],
    options?: LLMOptions & {
      onFinish?: (text: string) => Promise<void> | void;
    }
  ): Promise<ReadableStream<Uint8Array>> {
    const startTime = Date.now();
    const model = this.defaultModel;
    const temperature = options?.temperature ?? 0.3;
    const maxTokens = options?.maxTokens ?? 4096;

    // Connect to the stream using retry logic
    const stream = await this.executeWithRetryAndLogging(
      "GroqLLMService.streamText.connect", 
      async () => {
        return await this.client.chat.completions.create({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });
      }
    );

    const encoder = new TextEncoder();
    let fullText = "";

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullText += text;
              // Format for Vercel AI SDK useChat: 0:"chunkText"\n
              controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
            }
          }
          
          const duration = Date.now() - startTime;
          logger.info(
            { 
              operation: "GroqLLMService.streamText.complete", 
              durationMs: duration,
              model
            }, 
            "Groq stream finished successfully"
          );

          controller.close();
          
          if (options?.onFinish) {
            try {
              await options.onFinish(fullText);
            } catch (err) {
              logger.error(err, "Error in onFinish callback of streamText");
            }
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(
            { 
              operation: "GroqLLMService.streamText.error", 
              durationMs: duration, 
              error: error instanceof Error ? error.message : error 
            },
            "Error during Groq streaming"
          );
          controller.error(error);
        }
      },
    });
  }
}

// Reusable singleton LLM service instance
let llmServiceInstance: ILLMService | null = null;

export function getLLMService(): ILLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new GroqLLMService();
  }
  return llmServiceInstance;
}

/**
 * Compatibility helper for non-streaming chat generation
 */
export async function generateChatResponse({
  systemPrompt,
  prompt,
  temperature = 0.3,
  maxTokens = 2048,
}: {
  systemPrompt: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const service = getLLMService();
  return service.generateText(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    { temperature, maxTokens }
  );
}

/**
 * Compatibility helper for streaming chat response
 */
export async function streamChatResponse({
  systemPrompt,
  messages,
  temperature = 0.7,
  maxTokens = 4096,
}: {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const service = getLLMService();
  return service.streamText(
    [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    { temperature, maxTokens }
  );
}
