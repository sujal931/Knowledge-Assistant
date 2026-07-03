// ============================================
// Enterprise Knowledge Assistant — Type Definitions
// ============================================

// --- User & Auth ---
export interface IUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: "admin" | "member";
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganization {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: IOrgMember[];
  settings: IOrgSettings;
  storageUsed: number;
  maxStorage: number;
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrgMember {
  userId: string;
  role: "admin" | "member";
  joinedAt: Date;
}

export interface IOrgSettings {
  maxDocuments: number;
  maxFileSize: number;
  allowedFileTypes: string[];
}

// --- Documents ---
export type DocumentType = "pdf" | "docx" | "txt" | "md" | "url";
export type DocumentStatus = "processing" | "ready" | "error";

export interface IDocument {
  _id: string;
  title: string;
  type: DocumentType;
  organizationId: string;
  uploadedBy: string;
  status: DocumentStatus;
  fileSize: number;
  chunkCount: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  originalName?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Conversations ---
export interface IConversation {
  _id: string;
  title: string;
  organizationId: string;
  userId: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: ISource[];
  confidence?: number;
  followUpQuestions?: string[];
  agentAction?: string;
  timestamp: Date;
}

export interface ISource {
  documentId: string;
  documentTitle: string;
  chunkContent: string;
  score: number;
  page?: number;
  metadata?: Record<string, unknown>;
}

// --- Query Analytics ---
export interface IQueryLog {
  _id: string;
  query: string;
  organizationId: string;
  userId: string;
  responseTime: number;
  documentsUsed: string[];
  confidence: number;
  agentAction: string;
  createdAt: Date;
}

// --- AI Agent ---
export type QueryType = "rag" | "summarize" | "chat_search" | "direct";

export interface AgentState {
  messages: IChatMessage[];
  query: string;
  queryType: QueryType;
  organizationId: string;
  conversationId?: string;
  retrievedDocs: ISource[];
  context: string;
  response: string;
  sources: ISource[];
  confidence: number;
  followUpQuestions: string[];
  error?: string;
}

// --- API ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Dashboard Analytics ---
export interface DashboardAnalytics {
  totalDocuments: number;
  totalQueries: number;
  avgResponseTime: number;
  storageUsed: number;
  storageLimit: number;
  queriesOverTime: { date: string; count: number }[];
  popularDocuments: { title: string; queryCount: number }[];
  responseLatency: { range: string; count: number }[];
}
