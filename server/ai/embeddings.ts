import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";

let extractorPromise: any = null;

async function getExtractor() {
  if (!extractorPromise) {
    const { pipeline, env } = await import("@xenova/transformers");
    // Disable local model check to enforce downloading/loading Xenova ONNX models
    env.allowLocalModels = false;
    extractorPromise = pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
  }
  return extractorPromise;
}

export const EMBEDDING_DIMENSIONS = 384;

/**
 * Generate embedding for a single text locally
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getExtractor();
    const result = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(result.data as Float32Array);
  } catch (error) {
    console.error("Local embedding generation error:", error);
    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Generate embeddings for multiple texts sequentially to manage memory
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await generateEmbedding(text));
  }
  return embeddings;
}

/**
 * LangChain compatible Embeddings class for ChromaDB integration
 */
export class TransformersEmbeddings extends Embeddings {
  constructor(params?: EmbeddingsParams) {
    super(params ?? {});
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return generateEmbeddings(documents);
  }

  async embedQuery(document: string): Promise<number[]> {
    return generateEmbedding(document);
  }
}
