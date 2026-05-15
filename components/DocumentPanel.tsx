'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, FileText, Trash2, Loader2, BookOpen } from 'lucide-react';
import { RagDocument } from '@/lib/rag';

interface Props {
  onClose: () => void;
  onDocsChange: (count: number) => void;
}

export function DocumentPanel({ onClose, onDocsChange }: Props) {
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchDocs = async () => {
    const res = await fetch('/api/documents');
    if (res.ok) {
      const data = await res.json();
      setDocs(data);
      onDocsChange(data.length);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    setUploadStatus(`Processing "${file.name}"…`);

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/documents', { method: 'POST', body: form });
    const data = await res.json();

    setUploading(false);
    setUploadStatus('');

    if (!res.ok) {
      setError(data.error ?? 'Upload failed');
    } else {
      setUploadStatus(`✓ "${data.name}" added (${data.chunkCount} chunks)`);
      setTimeout(() => setUploadStatus(''), 3000);
      fetchDocs();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    fetchDocs();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  };

  return (
    <div className="absolute inset-0 z-20 flex justify-end" onClick={onClose}>
      <div
        className="w-80 h-full bg-[#161616] border-l border-white/10 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-purple-400" />
            <span className="text-white font-semibold text-sm">Documents</span>
            {docs.length > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">
                {docs.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Upload area */}
        <div className="p-4 border-b border-white/5">
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !uploading && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              uploading
                ? 'border-purple-500/30 bg-purple-500/5'
                : 'border-white/10 hover:border-purple-500/40 hover:bg-white/3'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.pdf"
              onChange={handleFile}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={20} className="text-purple-400 animate-spin" />
                <p className="text-xs text-gray-400">{uploadStatus}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={20} className="text-gray-500" />
                <p className="text-xs text-gray-400">
                  Drop a file or <span className="text-purple-400">browse</span>
                </p>
                <p className="text-[11px] text-gray-600">PDF, TXT, MD, CSV</p>
              </div>
            )}
          </div>

          {uploadStatus && !uploading && (
            <p className="text-xs text-green-400 mt-2 text-center">{uploadStatus}</p>
          )}
          {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-4">
          {docs.length === 0 ? (
            <div className="text-center text-gray-600 text-xs mt-8">
              <FileText size={24} className="mx-auto mb-2 opacity-40" />
              <p>No documents uploaded yet.</p>
              <p className="mt-1">Upload a file and the AI will use it to answer questions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 bg-white/5 rounded-xl p-3 group"
                >
                  <FileText size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{doc.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatSize(doc.size)} · {doc.chunkCount} chunks
                    </p>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {docs.length > 0 && (
          <div className="px-4 pb-4 text-[11px] text-gray-600 text-center">
            AI will automatically search these documents when you chat.
          </div>
        )}
      </div>
    </div>
  );
}
