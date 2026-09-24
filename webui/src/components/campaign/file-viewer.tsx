"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WORKFLOW_STEPS } from "@/lib/types";

interface FileViewerProps {
  campaignSlug: string;
  stepId: string;
}

export function FileViewer({ campaignSlug, stepId }: FileViewerProps) {
  const [content, setContentState] = useState<string | null>(null);
  const [loading, setLoadingState] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);

  const step = WORKFLOW_STEPS.find((s) => s.id === stepId);
  const fileName = step?.file ?? `${stepId}.md`;

  useEffect(() => {
    // Ignore responses from a previous step: switching steps quickly (or the
    // page moving off its initial default) must not let an older 404 overwrite
    // the current file.
    let stale = false;
    const setContent = (v: string | null) => { if (!stale) setContentState(v); };
    const setError = (v: string | null) => { if (!stale) setErrorState(v); };
    const setLoading = (v: boolean) => { if (!stale) setLoadingState(v); };

    setLoading(true);
    setError(null);

    // For directory steps (content/), we'd need to list files first.
    // For now, directly fetch the single file.
    const filePath = fileName.endsWith("/") ? null : fileName;

    if (!filePath) {
      // Directory step — fetch file list
      fetch(`/api/campaigns/${encodeURIComponent(campaignSlug)}`)
        .then((r) => r.json())
        .then((data) => {
          const files = (data.files ?? []).filter(
            (f: { stepId: string }) => f.stepId === stepId
          );
          if (files.length === 0) {
            setContent(null);
            setError("暂无内容文件");
          } else {
            // Load first file by default, show file list
            return fetch(
              `/api/campaigns/${encodeURIComponent(campaignSlug)}?file=${encodeURIComponent(files[0].path)}`
            )
              .then((r) => r.json())
              .then((d) => setContent(d.content ?? null));
          }
        })
        .catch(() => setError("加载失败"))
        .finally(() => setLoading(false));
      return () => { stale = true; };
    }

    fetch(
      `/api/campaigns/${encodeURIComponent(campaignSlug)}?file=${encodeURIComponent(filePath)}`
    )
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setContent(data.content))
      .catch(() => {
        setContent(null);
        setError("该步骤尚未产出文件");
      })
      .finally(() => setLoading(false));
    return () => { stale = true; };
  }, [campaignSlug, stepId, fileName]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中...
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">{error ?? "该步骤尚未产出文件"}</p>
        <p className="text-[11px] text-slate-400">
          在对话中执行相关技能后，产出将显示在此处
        </p>
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* File header */}
      <div className="mb-4 flex items-center gap-2 text-[11px] text-slate-400">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-mono">{fileName}</span>
      </div>

      {/* Rendered markdown */}
      <article className="prose prose-slate prose-sm max-w-none prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-a:text-brand-600 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-[12px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
