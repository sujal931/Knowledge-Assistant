import { similaritySearch } from "@/lib/ai/vectorstore";
import type { ISource } from "@/types";

const DEFAULT_K = 5;
const SCORE_THRESHOLD = 0.3;

/**
 * Retrieve relevant documents with source metadata from vector store
 */
export async function retrieveRelevantDocuments({
  organizationId,
  query,
  k = DEFAULT_K,
  scoreThreshold = SCORE_THRESHOLD,
}: {
  organizationId: string;
  query: string;
  k?: number;
  scoreThreshold?: number;
}): Promise<ISource[]> {
  // Search vector store using ChromaDB
  const results = await similaritySearch({
    organizationId,
    query,
    k: k * 2, // Fetch more to allow filtering and deduplication
  });

  // Filter by similarity score threshold
  const filtered = results.filter((r) => r.score >= scoreThreshold);

  // Deduplicate by document — keep the best chunk per document initially
  const docBestChunks = new Map<string, typeof filtered[0]>();
  for (const result of filtered) {
    const docId = result.metadata.documentId as string;
    const existing = docBestChunks.get(docId);
    if (!existing || result.score > existing.score) {
      docBestChunks.set(docId, result);
    }
  }

  // Sort and take top K unique documents
  const topResults = Array.from(docBestChunks.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  // Also include additional chunks from highly relevant documents for richer context
  const finalResults = [];
  for (const topResult of topResults) {
    finalResults.push(topResult);
    const additionalChunk = filtered.find(
      (r) =>
        r.metadata.documentId === topResult.metadata.documentId &&
        r.content !== topResult.content
    );
    if (additionalChunk) {
      finalResults.push(additionalChunk);
    }
  }

  // Map to ISource format for client usage
  const sources: ISource[] = finalResults.slice(0, k + 3).map((result) => ({
    documentId: result.metadata.documentId as string,
    documentTitle: (result.metadata.documentTitle as string) || "Unknown",
    chunkContent: result.content,
    score: Math.round(result.score * 100) / 100,
    page: result.metadata.chunkIndex as number | undefined,
    metadata: result.metadata,
  }));

  return sources;
}

/**
 * Build context string from retrieved sources
 */
export function buildContextFromSources(sources: ISource[]): string {
  if (sources.length === 0) {
    return "No relevant documents found in the knowledge base.";
  }

  const contextParts = sources.map((source, index) => {
    return `[Source ${index + 1}: "${source.documentTitle}" (relevance: ${Math.round(source.score * 100)}%)]\n${source.chunkContent}`;
  });

  return contextParts.join("\n\n---\n\n");
}

/**
 * Calculate overall confidence from source scores
 */
export function calculateConfidence(sources: ISource[]): number {
  if (sources.length === 0) return 0.1;

  const avgScore =
    sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
  const topScore = Math.max(...sources.map((s) => s.score));

  // Weighted: 60% top score, 40% average
  const confidence = topScore * 0.6 + avgScore * 0.4;

  return Math.round(confidence * 100) / 100;
}
