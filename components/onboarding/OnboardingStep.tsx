"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepConfig {
  label: string;
}

interface OnboardingStepProps {
  currentStep: number;
  steps: StepConfig[];
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function OnboardingStep({
  currentStep,
  steps,
  children,
  title,
  description,
}: OnboardingStepProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div key={idx} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                    isComplete
                      ? "text-white"
                      : isActive
                      ? "text-white border-2"
                      : "text-slate-500 border-2"
                  )}
                  style={{
                    background: isComplete
                      ? "#22C55E"
                      : isActive
                      ? "transparent"
                      : "transparent",
                    borderColor: isActive
                      ? "#22C55E"
                      : isComplete
                      ? "#22C55E"
                      : "var(--border-col)",
                  }}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    isActive ? "text-white" : "text-slate-500"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className="w-16 h-0.5 mb-5 mx-1 transition-all duration-300"
                  style={{
                    background: stepNum < currentStep ? "#22C55E" : "var(--border-col)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step header */}
      {(title || description) && (
        <div className="mb-6 text-center">
          {title && (
            <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-slate-400">{description}</p>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
      >
        {children}
      </div>
    </div>
  );
}
