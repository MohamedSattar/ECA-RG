import * as React from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

interface SectionGuidelineHintProps {
  sectionName: string;
  description: string;
}

export function SectionGuidelineHint({
  sectionName,
  description,
}: SectionGuidelineHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${sectionName} guideline`}
          className="inline-flex h-5 w-5 shrink-0 self-center items-center justify-center align-middle leading-none text-[#1D2054] transition-opacity hover:opacity-80"
        >
          <Icon iconName="Info" styles={{ root: { fontSize: 13, lineHeight: 1 } }} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-[min(22rem,calc(100vw-2.5rem))] max-w-[22rem] rounded-xl border border-[#d9e3ff] bg-white/95 p-0 shadow-xl transition-all duration-200 data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95 backdrop-blur supports-[backdrop-filter]:bg-white/90"
      >
        <div className="overflow-hidden rounded-xl">
          <div className="flex items-center gap-2 border-b border-[#e7edff] bg-gradient-to-r from-[#f7faff] to-[#edf4ff] px-4 py-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1D2054]/10 text-[#1D2054]">
              <Icon iconName="Lightbulb" styles={{ root: { fontSize: 12 } }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1D2054]">
              {sectionName} Guideline
            </p>
          </div>
          <p className="px-4 py-3 text-sm leading-6 text-slate-700">
            {description}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

