"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  File,
  Link2,
  Search,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  Grid3X3,
  List,
  X,
  Globe,
} from "lucide-react";
import { formatFileSize, formatDate, getDocumentIcon } from "@/lib/utils";

interface Document {
  _id: string;
  title: string;
  type: string;
  status: "processing" | "ready" | "error";
  fileSize: number;
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
  originalName?: string;
  url?: string;
}

interface DocumentsPageClientProps {
  organizationId: string;
  userId: string;
}

export default function DocumentsPageClient({
  organizationId,
  userId,
}: DocumentsPageClientProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        organizationId,
        ...(searchQuery && { search: searchQuery }),
        ...(filterType && { type: filterType }),
      });
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, searchQuery, filterType]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing status
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);

      for (const file of acceptedFiles) {
        try {
          setUploadProgress(`Uploading ${file.name}...`);
          const formData = new FormData();
          formData.append("file", file);
          formData.append("organizationId", organizationId);
          formData.append("userId", userId);
          formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

          const res = await fetch("/api/documents", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (data.success) {
            setDocuments((prev) => [data.data, ...prev]);
          }
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }

      setUploading(false);
      setUploadProgress("");
    },
    [organizationId, userId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    setUploadProgress("Ingesting URL...");

    try {
      const res = await fetch("/api/documents/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput,
          organizationId,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => [data.data, ...prev]);
        setUrlInput("");
        setShowUrlInput(false);
      }
    } catch (err) {
      console.error("URL ingest failed:", err);
    }

    setUploading(false);
    setUploadProgress("");
  };

  const deleteDocument = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const reindexDocument = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: "PATCH" });
      setDocuments((prev) =>
        prev.map((d) => (d._id === id ? { ...d, status: "processing" as const } : d))
      );
    } catch (err) {
      console.error("Re-index failed:", err);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
      ready: { icon: CheckCircle, color: "text-green-400 bg-green-500/10 border-green-500/20", label: "Ready" },
      processing: { icon: Loader2, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Processing" },
      error: { icon: AlertCircle, color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Error" },
    };
    const config = configs[status] || configs.error;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color}`}>
        <config.icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Documents</h1>
            <p className="text-sm text-white/40 mt-1">
              Upload and manage your knowledge base documents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              Add URL
            </button>
          </div>
        </div>

        {/* URL Input */}
        {showUrlInput && (
          <div className="p-4 mb-6 bg-white/[0.02] border border-white/5 rounded-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/page"
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 focus:outline-none"
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || uploading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Ingest
              </button>
              <button onClick={() => setShowUrlInput(false)} className="p-1 hover:text-white/60">
                <X className="w-4 h-4 text-white/30" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`p-8 mb-8 border rounded-2xl cursor-pointer transition-all duration-300 text-center ${
            isDragActive
              ? "border-indigo-400/50 bg-indigo-500/5 scale-[1.01]"
              : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              isDragActive
                ? "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white"
                : "bg-indigo-500/10 text-indigo-400"
            }`}>
              <Upload className="w-6 h-6" />
            </div>
            {uploading ? (
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress}
              </div>
            ) : isDragActive ? (
              <p className="text-sm text-indigo-400 font-medium">Drop files here</p>
            ) : (
              <>
                <p className="text-sm text-white/60 mb-1">
                  Drag & drop files here, or <span className="text-indigo-400">click to browse</span>
                </p>
                <p className="text-[11px] text-white/25">
                  PDF, DOCX, TXT, Markdown — Max 50MB per file
                </p>
              </>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white/3 border border-white/5 text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl bg-white/3 border border-white/5 text-white/60 focus:outline-none"
          >
            <option value="">All types</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="txt">TXT</option>
            <option value="md">Markdown</option>
            <option value="url">URL</option>
          </select>
          <div className="flex items-center border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 ${viewMode === "grid" ? "bg-white/8" : "hover:bg-white/3"}`}
            >
              <Grid3X3 className="w-4 h-4 text-white/40" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 ${viewMode === "list" ? "bg-white/8" : "hover:bg-white/3"}`}
            >
              <List className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Documents Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-5 h-36 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-sm text-white/30">No documents yet</p>
            <p className="text-xs text-white/15 mt-1">Upload your first document to get started</p>
          </div>
        ) : (
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-2"
          }>
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 animate-fade-in"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                    <div>
                      <h3 className="text-sm font-medium text-white/80 line-clamp-1">
                        {doc.title}
                      </h3>
                      <p className="text-[10px] text-white/25 mt-0.5">
                        {doc.type.toUpperCase()} • {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 text-[11px] text-white/25">
                    <span>{doc.chunkCount} chunks</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => reindexDocument(doc._id)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-indigo-400 transition-colors"
                      title="Re-index"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc._id)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {doc.status === "error" && doc.errorMessage && (
                  <p className="text-[10px] text-red-400/60 mt-2 line-clamp-2">
                    {doc.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
