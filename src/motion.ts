import { flushSync } from "react-dom";

type ViewTransitionLike = {
  finished: Promise<unknown>;
  skipTransition: () => void;
};
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionLike;
};

let activeLocalTransition: ViewTransitionLike | null = null;

export function motionAllowed() {
  return (
    typeof document !== "undefined" &&
    typeof (document as ViewTransitionDocument).startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Start a Router-owned view transition and return a cleanup for its mode flag. */
export function beginRouteMotion(mode: string) {
  if (!motionAllowed() || document.documentElement.dataset.routeMotion) return null;
  document.documentElement.dataset.routeMotion = mode;
  return () => {
    if (document.documentElement.dataset.routeMotion === mode) {
      delete document.documentElement.dataset.routeMotion;
    }
  };
}

/** Crossfade a local state change while retaining an instant keyboard fallback. */
export function updateWithMotion(mode: string, update: () => void, animate: boolean) {
  const viewDocument = document as ViewTransitionDocument;
  if (activeLocalTransition) {
    activeLocalTransition.skipTransition();
    activeLocalTransition = null;
    delete document.documentElement.dataset.localMotion;
  }
  if (!animate || !motionAllowed()) {
    update();
    return;
  }

  document.documentElement.dataset.localMotion = mode;
  const transition = viewDocument.startViewTransition?.(() => flushSync(update));
  if (!transition) {
    delete document.documentElement.dataset.localMotion;
    update();
    return;
  }
  activeLocalTransition = transition;
  void transition.finished.finally(() => {
    if (activeLocalTransition === transition) activeLocalTransition = null;
    if (document.documentElement.dataset.localMotion === mode) {
      delete document.documentElement.dataset.localMotion;
    }
  });
}
