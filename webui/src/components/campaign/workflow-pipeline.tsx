"use client";

import { WORKFLOW_STEPS, type StepStatus } from "@/lib/types";
import { cn, statusDot, statusLabel } from "@/lib/utils";

interface WorkflowPipelineProps {
  steps: Record<string, StepStatus>;
  activeStep: string | null;
  onSelectStep: (stepId: string) => void;
}

const STEP_ICONS: Record<string, JSX.Element> = {
  brief: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  research: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  strategy: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  content: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  geo: <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  automation: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
  dtc: <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
  channel: <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />,
  analytics: <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />,
  compete: <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
  review: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  report: <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
};

export function WorkflowPipeline({ steps, activeStep, onSelectStep }: WorkflowPipelineProps) {
  // Only the steps in this campaign's plan (its tier, or the manual flow).
  const visibleSteps = WORKFLOW_STEPS.filter((step) => step.id in steps);

  return (
    <div className="space-y-0.5">
      <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Pipeline
      </p>

      {visibleSteps.map((step, idx) => {
        const status = steps[step.id] ?? "pending";
        const isActive = activeStep === step.id;
        const isLast = idx === visibleSteps.length - 1;
        const icon = STEP_ICONS[step.id];

        return (
          <div key={step.id} className="relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[15px] top-[32px] h-[calc(100%-8px)] w-px",
                  status === "done" ? "bg-emerald-200" : "bg-slate-200"
                )}
              />
            )}

            <button
              onClick={() => onSelectStep(step.id)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all",
                isActive
                  ? "bg-brand-50 ring-1 ring-brand-200"
                  : "hover:bg-slate-50",
                status === "pending" && !isActive && "opacity-50"
              )}
            >
              {/* Icon circle */}
              <div
                className={cn(
                  "flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg border transition-colors",
                  status === "done" && "border-emerald-200 bg-emerald-50 text-emerald-600",
                  status === "running" && "border-amber-200 bg-amber-50 text-amber-600",
                  status === "error" && "border-rose-200 bg-rose-50 text-rose-600",
                  status === "pending" && "border-slate-200 bg-slate-50 text-slate-400",
                  isActive && status === "pending" && "border-brand-200 bg-brand-50 text-brand-600 opacity-100"
                )}
              >
                {icon ? (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    {icon}
                  </svg>
                ) : (
                  <span className={cn("h-2 w-2 rounded-full", statusDot(status))} />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      isActive ? "text-brand-700" : "text-slate-700"
                    )}
                  >
                    {step.nameCn}
                  </span>
                  {step.optional && status === "pending" && (
                    <span className="text-[10px] text-slate-400">可选</span>
                  )}
                </div>
                {status !== "pending" && (
                  <span
                    className={cn(
                      "text-[11px]",
                      status === "done" && "text-emerald-500",
                      status === "running" && "text-amber-500",
                      status === "error" && "text-rose-500"
                    )}
                  >
                    {statusLabel(status)}
                  </span>
                )}
              </div>

              {/* Running indicator */}
              {status === "running" && (
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
