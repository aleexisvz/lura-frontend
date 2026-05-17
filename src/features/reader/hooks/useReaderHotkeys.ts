import { useEffect } from "react";

type ReaderHotkeysOptions = {
  onNext: () => void;
  onPrev: () => void;
  onToggleFullscreen: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function useReaderHotkeys(options: ReaderHotkeysOptions) {
  const { onNext, onPrev, onToggleFullscreen } = options;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        onNext();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        onToggleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNext, onPrev, onToggleFullscreen]);
}
