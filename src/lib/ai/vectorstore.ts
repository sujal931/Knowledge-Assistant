import { ChromaClient } from "chromadb-client";
import { generateEmbedding, generateEmbeddings, EMBEDDING_DIMENSIONS } from "@server/ai/embeddings";

let chromaClient: ChromaClient | null = null;

function getChromaClient(): ChromaClient {
  if (!chromaClient) {
    chromaClient = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }
  return chromaClient;
}

function getCollectionName(organizationId: string): string {
  return `org_${organizationId}`;
}

/**
 * Get or create a collection for an organization
 */
async function getCollection(organizationId: string) {
  const client = getChromaClient();
  try {
    return await client.getOrCreateCollection({
      name: getCollectionName(organizationId),
      metadata: { "hnsw:space": "cosine" },
    });
  } catch (error) {
    console.error("ChromaDB collection error:", error);
    throw new Error("Failed to access vector database");
  }
}

/**
 * Add document chunks to the vector store
 */
export async function addDocuments({
  organizationId,
  documentId,
  chunks,
  metadatas,
}: {
  organizationId: string;
  documentId: string;
  chunks: string[];
  metadatas: Record<string, unknown>[];
}) {
  const collection = await getCollection(organizationId);

  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks);

  // Create unique IDs for each chunk
  const ids = chunks.map((_, index) => `${documentId}_chunk_${index}`);

  // Enrich metadata with document info
  const enrichedMetadatas = metadatas.map((meta) => ({
    ...meta,
    documentId,
    organizationId,
  }));

  // Add to ChromaDB in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, chunks.length);
    await collection.add({
      ids: ids.slice(i, batchEnd),
      embeddings: embeddings.slice(i, batchEnd),
      documents: chunks.slice(i, batchEnd),
      metadatas: enrichedMetadatas.slice(i, batchEnd) as Record<string, string | number | boolean>[],
    });
  }

  return ids.length;
}

/**
 * Similarity search with optional metadata filtering
 */
export async function similaritySearch({
  organizationId,
  query,
  k = 5,
  filter,
}: {
  organizationId: string;
  query: string;
  k?: number;
  filter?: Record<string, unknown>;
}) {
  const collection = await getCollection(organizationId);

  const queryEmbedding = await generateEmbedding(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: k,
    where: filter as Record<string, string | number | boolean> | undefined,
  });

  // Format results
  const documents: {
    content: string;
    metadata: Record<string, unknown>;
    score: number;
  }[] = [];

  if (results.documents?.[0]) {
    for (let i = 0; i < results.documents[0].length; i++) {
      documents.push({
        content: results.documents[0][i] || "",
        metadata: (results.metadatas?.[0]?.[i] as Record<string, unknown>) || {},
        score: results.distances?.[0]?.[i]
          ? 1 - (results.distances[0][i] as number) // Convert distance to similarity
          : 0,
      });
    }
  }

  // Sort by score descending
  documents.sort((a, b) => b.score - a.score);

  return documents;
}

/**
 * Delete all chunks for a specific document
 */
export async function deleteDocumentVectors(
  organizationId: string,
  documentId: string
) {
  const collection = await getCollection(organizationId);

  try {
    await collection.delete({
      where: { documentId } as Record<string, string>,
    });
  } catch (error) {
    console.error("Error deleting vectors:", error);
    throw new Error("Failed to delete document vectors");
  }
}

/**
 * Delete entire organization collection
 */
export async function deleteOrganizationCollection(organizationId: string) {
  const client = getChromaClient();
  try {
    await client.deleteCollection({ name: getCollectionName(organizationId) });
  } catch (error) {
    console.error("Error deleting collection:", error);
  }
}

export { EMBEDDING_DIMENSIONS };
