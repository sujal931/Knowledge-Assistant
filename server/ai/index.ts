import { Chroma } from "@langchain/community/vectorstores/chroma";
import { TransformersEmbeddings } from "./embeddings";

export * from "./groq";
export * from "./embeddings";
export * from "./prompt";
export * from "./retriever";
export * from "./rag";
export * from "./agent";

/**
 * Factory function to retrieve a LangChain-compatible Chroma vector store
 * using our local Hugging Face embedding provider.
 */
export function getLangChainChromaStore(organizationId: string): Chroma {
  return new Chroma(
    new TransformersEmbeddings(),
    {
      collectionName: `org_${organizationId}`,
      url: process.env.CHROMA_URL || "http://localhost:8000",
    }
  );
}
