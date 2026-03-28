import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DefaultButton, IconButton, PrimaryButton } from "@fluentui/react/lib/Button";
import { Icon } from "@fluentui/react/lib/Icon";

export type SectionGuideTourSection<K extends string = string> = {
  key: K;
  title: string;
  hint: string;
};

type SectionGuideTourProps<K extends string = string> = {
  sections: SectionGuideTourSection<K>[];
  storageKey: string;
  containerRef: RefObject<HTMLDivElement | null>;
  sectionRefs: Record<K, RefObject<HTMLDivElement | null>>;
  onStepChange?: (sectionKey: K) => void;
  triggerButtonText?: string;
  secondaryButtonStyles?: any;
  primaryButtonStyles?: any;
};

export default function SectionGuideTour<K extends string = string>({
  sections,
  storageKey,
  containerRef,
  sectionRefs,
  onStepChange,
  triggerButtonText = "Show Section Guide",
  secondaryButtonStyles,
  primaryButtonStyles,
}: SectionGuideTourProps<K>) {
  const [showGuide, setShowGuide] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 90, left: 24 });
  const popupRef = useRef<HTMLDivElement | null>(null);
  const currentSection = useMemo(() => sections[stepIndex], [sections, stepIndex]);

  useEffect(() => {
    try {
      const skipped = localStorage.getItem(storageKey);
      if (!skipped) setShowGuide(true);
    } catch {
      // no-op when localStorage is unavailable
    }
  }, [storageKey]);

  useEffect(() => {
    if (!showGuide || !currentSection) return;

    onStepChange?.(currentSection.key);

    const targetSection = sectionRefs[currentSection.key]?.current;
    if (!targetSection) return;

    targetSection.scrollIntoView({ behavior: "smooth", block: "center" });

    const updatePopupPosition = () => {
      const rect = targetSection.getBoundingClientRect();
      const cardWidth = 380;
      const cardHeight = popupRef.current?.offsetHeight ?? 340;
      const gap = 14;
      const padding = 12;
      const containerRect = containerRef.current?.getBoundingClientRect();
      const minLeft = containerRect ? containerRect.left + padding : padding;
      const maxLeft = containerRect
        ? Math.max(minLeft, containerRect.right - cardWidth - padding)
        : Math.max(padding, window.innerWidth - cardWidth - padding);
      const preferredRight = rect.right + gap;
      const nextLeft = Math.max(minLeft, Math.min(maxLeft, preferredRight));
      const minTop = padding;
      const maxTop = Math.max(minTop, window.innerHeight - cardHeight - padding);
      const nextTop = Math.max(minTop, Math.min(maxTop, rect.top + 8));

      setPopupPos({ top: nextTop, left: nextLeft });
    };

    const timer = window.setTimeout(updatePopupPosition, 220);
    window.addEventListener("resize", updatePopupPosition);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updatePopupPosition);
    };
  }, [containerRef, currentSection, onStepChange, sectionRefs, showGuide]);

  const openGuide = useCallback(() => {
    setStepIndex(0);
    setShowGuide(true);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev >= sections.length - 1) {
        setShowGuide(false);
        return prev;
      }
      return prev + 1;
    });
  }, [sections.length]);

  const previousStep = useCallback(() => {
    setStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const skipGuide = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // no-op
    }
    setShowGuide(false);
  }, [storageKey]);

  const closeGuide = useCallback(() => {
    setShowGuide(false);
  }, []);

  const guideTriggerButtonStyles = useMemo(() => {
    const base = secondaryButtonStyles ?? {};
    return {
      ...base,
      root: {
        ...base.root,
        minHeight: 30,
        height: 30,
        paddingLeft: 10,
        paddingRight: 12,
        paddingTop: 0,
        paddingBottom: 0,
      },
      rootHovered: {
        ...base.rootHovered,
        minHeight: 30,
      },
      rootPressed: {
        ...base.rootPressed,
        minHeight: 30,
      },
      flexContainer: {
        ...base.flexContainer,
        height: 30,
      },
      label: {
        ...base.label,
        fontSize: 12,
        lineHeight: 1,
        fontWeight: 600,
      },
      icon: {
        ...base.icon,
        fontSize: 12,
      },
    };
  }, [secondaryButtonStyles]);

  const closeIconButtonStyles = useMemo(
    () => ({
      root: {
        width: 22,
        height: 22,
        minWidth: 22,
        flexShrink: 0,
        borderRadius: 4,
        backgroundColor: "transparent",
        color: "#64748b",
      },
      rootHovered: {
        backgroundColor: "rgba(241, 245, 249, 0.95)",
        color: "#475569",
      },
      rootPressed: {
        backgroundColor: "#e2e8f0",
        color: "#334155",
      },
      icon: {
        color: "#64748b",
        fontSize: 10,
        lineHeight: 1,
      },
      iconHovered: {
        color: "#1D2054",
      },
      iconPressed: {
        color: "#1D2054",
      },
    }),
    [],
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <DefaultButton
          text={triggerButtonText}
          iconProps={{ iconName: "Info" }}
          onClick={openGuide}
          styles={guideTriggerButtonStyles}
        />
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-[100] bg-slate-900/35 p-4">
          <div
            ref={popupRef}
            className="fixed max-h-[72vh] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl border border-[#d9e3ff] bg-white shadow-2xl transition-[top,left] duration-300"
            style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
          >
            <div className="border-b border-[#e7edff] bg-gradient-to-r from-[#f7faff] to-[#edf4ff] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D2054]/10 text-[#1D2054]">
                    <Icon iconName="Lightbulb" styles={{ root: { fontSize: 12 } }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D2054]">Guided Tour</h3>
                    <p className="text-xs text-slate-600">
                      Step {stepIndex + 1} of {sections.length}
                    </p>
                  </div>
                </div>
                <IconButton
                  iconProps={{ iconName: "ChromeClose" }}
                  ariaLabel="Close guided tour"
                  onClick={closeGuide}
                  styles={closeIconButtonStyles}
                />
              </div>
            </div>

            <div className="max-h-[52vh] overflow-auto px-4 py-3.5">
              <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
                <span className="font-semibold">Tip:</span> If you choose{" "}
                <span className="font-medium">Skip</span>, this tour will not open automatically
                the next time you visit this page.
              </p>
              <div className="rounded-lg border border-[#e4ecff] bg-gradient-to-r from-white to-[#f8faff] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6473a1]">
                  Current Section
                </p>
                <p className="mt-1 text-base font-bold text-[#1D2054]">
                  {currentSection?.title}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-700">
                  {currentSection?.hint}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                {sections.map((s, idx) => (
                  <button
                    key={s.title}
                    type="button"
                    aria-label={`Go to ${s.title}`}
                    onClick={() => setStepIndex(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === stepIndex
                        ? "w-8 bg-[#1D2054]"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#e7edff] px-4 py-3">
              <div className="flex items-center gap-2">
                <DefaultButton
                  text="Previous"
                  iconProps={{ iconName: "ChevronLeft" }}
                  disabled={stepIndex === 0}
                  onClick={previousStep}
                  styles={secondaryButtonStyles}
                />
                <PrimaryButton
                  text={stepIndex === sections.length - 1 ? "Finish" : "Next"}
                  iconProps={{
                    iconName: stepIndex === sections.length - 1 ? "Accept" : "ChevronRight",
                  }}
                  onClick={nextStep}
                  styles={primaryButtonStyles}
                />
              </div>
              <PrimaryButton text="Skip" onClick={skipGuide} styles={primaryButtonStyles} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
