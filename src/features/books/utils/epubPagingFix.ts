/**
 * Utility to fix epub.js two-page spread navigation issues.
 *
 * Problem in epub.js (DefaultViewManager):
 * In horizontal paginated spread mode (2 pages side-by-side, e.g. 1000px wide):
 * 1. When a section has an odd number of pages (e.g. 7 pages):
 *    - Spread 0: Pages 1 & 2 (0px to 1000px).
 *    - Spread 1: Pages 3 & 4 (1000px to 2000px).
 *    - Spread 2: Pages 5 & 6 (2000px to 3000px).
 *    - Spread 3: Page 7 on left (3000px to ~3470px), and empty space on the right (3500px to 4000px).
 * 2. In epub.js vanilla navigation:
 *    left = this.container.scrollLeft + this.container.offsetWidth + this.layout.delta;
 *    if (left <= this.container.scrollWidth) { ... } else { next = section.next(); }
 *    At Spread 2: left = 2000 + 1000 + 1000 = 4000px.
 *    Because Page 7 only fills ~3470px, this.container.scrollWidth is only ~3500px.
 *    Because 4000 <= 3500 is FALSE, epub.js concludes there is no next spread and jumps straight
 *    to the next chapter, completely skipping the 1-half spread (Spread 3)!
 * 3. Going backwards (prev()):
 *    Epub.js calls: this.scrollTo(this.container.scrollWidth - this.layout.delta, 0, true);
 *    3500 - 1000 = 2500px! It lands on an unaligned offset (2500px), splitting Page 6 and Page 7 across the middle.
 * 4. Queue deadlocks:
 *    Epub.js Queue class has no error handling in `this.dequeue().then(...)`.
 *    Rapid clicks or unhandled rejections cause `this.running = true` permanently, freezing navigation.
 */

export function getContentWidth(view: any): number {
  if (!view) return 0;
  const doc = view.document || view.contents?.document;
  if (!doc || !doc.body) {
    return view.element?.offsetWidth || 0;
  }

  let maxRight = 0;

  // 1. Check document.body and documentElement scrollWidth
  try {
    if (doc.body && typeof doc.body.scrollWidth === "number") {
      if (doc.body.scrollWidth > maxRight) maxRight = doc.body.scrollWidth;
    }
  } catch {}

  try {
    if (doc.documentElement && typeof doc.documentElement.scrollWidth === "number") {
      if (doc.documentElement.scrollWidth > maxRight) maxRight = doc.documentElement.scrollWidth;
    }
  } catch {}

  // 2. Check full range bounding rect & client rects (fragments across CSS columns)
  try {
    const range = doc.createRange();
    range.selectNodeContents(doc.body);

    const rect = range.getBoundingClientRect();
    if (rect.right > maxRight) maxRight = rect.right;
    if (rect.width > maxRight) maxRight = rect.width;

    const clientRects = range.getClientRects();
    for (let i = 0; i < clientRects.length; i++) {
      const r = clientRects[i];
      if (r.right > maxRight) {
        maxRight = r.right;
      }
    }
  } catch {}

  // 3. Inspect individual elements in document.body
  try {
    const all = doc.body.querySelectorAll("*");
    const len = all.length;
    for (let i = 0; i < len; i++) {
      const el = all[i];
      const b = el.getBoundingClientRect();
      if (b.right > maxRight) maxRight = b.right;

      const rects = el.getClientRects();
      for (let j = 0; j < rects.length; j++) {
        if (rects[j].right > maxRight) {
          maxRight = rects[j].right;
        }
      }
    }
  } catch {}

  // 4. Also check view.contents.textWidth() if available
  try {
    if (typeof view.contents?.textWidth === "function") {
      const tw = view.contents.textWidth();
      if (tw > maxRight) maxRight = tw;
    }
  } catch {}

  return Math.ceil(maxRight);
}

/**
 * Calculates the exact number of two-page spreads required to display contentWidth.
 * Avoids any crude subpixel subtraction that would drop a spread when content on the last spread is short.
 */
export function calculateSpreadCount(contentWidth: number, spreadWidth: number): number {
  if (spreadWidth <= 0) return 1;
  if (contentWidth <= 0) return 1;

  const baseSpreads = Math.floor(contentWidth / spreadWidth);
  const remainder = contentWidth - baseSpreads * spreadWidth;

  // Between columns and spreads there is at least 30px-60px gap + padding.
  // Any remainder > 10px means content has flowed into the next spread.
  return remainder > 10 ? baseSpreads + 1 : Math.max(1, baseSpreads);
}

export function ensureEvenSpreadWidth(
  view: any,
  manager: any
): { spreadWidth: number; totalSpreads: number } {
  if (!view || !view.element || !manager) {
    return { spreadWidth: 0, totalSpreads: 1 };
  }

  const layout = manager.layout;
  const spreadWidth =
    layout?.delta ||
    layout?.width ||
    manager.container?.offsetWidth ||
    0;

  if (!spreadWidth || spreadWidth <= 0) {
    return { spreadWidth: 0, totalSpreads: 1 };
  }

  const divisor = layout?.divisor || 1;
  if (divisor <= 1 && !layout?._spread) {
    return { spreadWidth, totalSpreads: 1 };
  }

  const contentWidth = getContentWidth(view);
  const effectiveWidth = Math.max(contentWidth, spreadWidth);
  const totalSpreads = calculateSpreadCount(effectiveWidth, spreadWidth);
  const targetWidth = totalSpreads * spreadWidth;

  if (view.element) {
    view.element.style.width = `${targetWidth}px`;
    view.element.style.minWidth = `${targetWidth}px`;
    view.element.style.flex = "0 0 auto";
  }
  if (view.iframe) {
    view.iframe.style.width = `${targetWidth}px`;
    view.iframe.style.minWidth = `${targetWidth}px`;
  }
  view._width = targetWidth;
  view.width = () => targetWidth;

  if (manager.container) {
    manager.container.style.overflowX = "hidden";
    manager.container.style.overflowY = "hidden";
    manager.container.style.display = "flex";
    manager.container.style.flexDirection = "row";
    manager.container.style.flexWrap = "nowrap";
  }

  return { spreadWidth, totalSpreads };
}

function setupManagerHooks(rendition: any, manager: any): () => void {
  const origNext = manager.next?.bind(manager);
  const origPrev = manager.prev?.bind(manager);

  if (!origNext || !origPrev) {
    return () => {};
  }

  // 1. Protect rendition.q against deadlocks from unhandled errors
  let origDequeue: any = null;
  let origRun: any = null;

  if (rendition.q) {
    if (typeof rendition.q.dequeue === "function") {
      origDequeue = rendition.q.dequeue.bind(rendition.q);
      rendition.q.dequeue = function safeDequeue() {
        try {
          const res = origDequeue();
          if (res && typeof res.then === "function") {
            return res.catch((err: any) => {
              console.warn("Safely recovered from epub rendition queue task error:", err);
              return undefined;
            });
          }
          return res;
        } catch (err) {
          console.warn("Safely caught synchronous epub rendition queue task error:", err);
          return Promise.resolve();
        }
      };
    }

    if (typeof rendition.q.run === "function") {
      origRun = rendition.q.run.bind(rendition.q);
      rendition.q.run = function safeRun() {
        try {
          const res = origRun();
          if (res && typeof res.then === "function") {
            return res.catch((err: any) => {
              console.warn("Safely recovered from epub rendition queue.run rejection:", err);
              this.running = false;
              if (this._q?.length > 0) {
                setTimeout(() => this.run?.(), 50);
              }
              return undefined;
            });
          }
          return res;
        } catch (err) {
          console.warn("Safely caught synchronous epub rendition queue.run error:", err);
          this.running = false;
          return Promise.resolve();
        }
      };
    }
  }

  // Helper to ensure the queue is active if tasks are waiting
  const ensureQueueRunning = () => {
    try {
      if (rendition.q) {
        if (rendition.q.paused) {
          rendition.q.paused = false;
        }
        if (rendition.q._q?.length > 0 && !rendition.q.running) {
          rendition.q.run?.();
        }
      }
    } catch {}
  };

  // Wrap view.expand to prevent background timer from shrinking view element/iframe
  const wrapViewExpand = (view: any) => {
    if (!view || view.__pagingFixWrapped) return;
    view.__pagingFixWrapped = true;
    const originalExpand = view.expand?.bind(view);
    if (originalExpand) {
      view.expand = function safeExpand(force: any) {
        originalExpand(force);
        ensureEvenSpreadWidth(this, manager);
      };
    }
  };

  // 2. Patched manager.next()
  manager.next = function patchedNext() {
    ensureQueueRunning();

    if (!this.views || !this.views.length) {
      return origNext();
    }

    const dir = this.settings?.direction;
    const isHorizontalPaginated =
      this.isPaginated &&
      this.settings?.axis === "horizontal" &&
      (!dir || dir === "ltr");

    if (!isHorizontalPaginated) {
      return origNext();
    }

    const currentView = this.views.first();
    const spreadWidth =
      this.layout?.delta ||
      this.layout?.width ||
      this.container?.offsetWidth ||
      0;

    if (!spreadWidth || !this.container) {
      return origNext();
    }

    wrapViewExpand(currentView);
    const { totalSpreads } = ensureEvenSpreadWidth(currentView, this);

    const scrollLeft = this.container.scrollLeft || 0;
    const currentSpread = Math.round(scrollLeft / spreadWidth);
    const targetSpread = currentSpread + 1;

    // Check if there is another spread in the current chapter
    if (targetSpread < totalSpreads) {
      const targetScroll = targetSpread * spreadWidth;

      // Ensure view wrapper and iframe are wide enough
      const requiredWidth = totalSpreads * spreadWidth;
      if (currentView.element) {
        currentView.element.style.width = `${requiredWidth}px`;
        currentView.element.style.minWidth = `${requiredWidth}px`;
        currentView.element.style.flex = "0 0 auto";
      }
      if (currentView.iframe) {
        currentView.iframe.style.width = `${requiredWidth}px`;
        currentView.iframe.style.minWidth = `${requiredWidth}px`;
      }

      this.scrollTo(targetScroll, 0, true);
      this.container.scrollLeft = targetScroll;

      return Promise.resolve();
    }

    // End of chapter reached -> advance cleanly to the next chapter
    try {
      const res = origNext();
      if (res && typeof res.then === "function") {
        return res
          .then((val: any) => {
            if (this.container) {
              this.container.scrollLeft = 0;
            }
            const newView = this.views?.first();
            if (newView) {
              wrapViewExpand(newView);
              ensureEvenSpreadWidth(newView, this);
            }
            return val;
          })
          .catch((err: any) => {
            console.warn("origNext caught error:", err);
            if (this.container) this.container.scrollLeft = 0;
            return undefined;
          });
      }
      if (this.container) {
        this.container.scrollLeft = 0;
      }
      return Promise.resolve();
    } catch (err) {
      console.warn("Synchronous error in origNext:", err);
      return Promise.resolve();
    }
  };

  // 3. Patched manager.prev()
  manager.prev = function patchedPrev() {
    ensureQueueRunning();

    if (!this.views || !this.views.length) {
      return origPrev();
    }

    const dir = this.settings?.direction;
    const isHorizontalPaginated =
      this.isPaginated &&
      this.settings?.axis === "horizontal" &&
      (!dir || dir === "ltr");

    if (!isHorizontalPaginated) {
      return origPrev();
    }

    const currentView = this.views.first();
    const spreadWidth =
      this.layout?.delta ||
      this.layout?.width ||
      this.container?.offsetWidth ||
      0;

    if (!spreadWidth || !this.container) {
      return origPrev();
    }

    wrapViewExpand(currentView);
    const scrollLeft = this.container.scrollLeft || 0;
    const currentSpread = Math.round(scrollLeft / spreadWidth);

    // If we can move back within the current section:
    if (currentSpread > 0) {
      const prevSpread = currentSpread - 1;
      const targetScroll = prevSpread * spreadWidth;
      this.scrollTo(targetScroll, 0, true);
      this.container.scrollLeft = targetScroll;
      return Promise.resolve();
    }

    // On spread 0 -> move to previous section
    try {
      const res = origPrev();
      if (res && typeof res.then === "function") {
        return res
          .then((val: any) => {
            const newView = this.views?.first();
            if (newView && this.container) {
              wrapViewExpand(newView);
              const { spreadWidth: sw, totalSpreads: prevTotalSpreads } =
                ensureEvenSpreadWidth(newView, this);

              // Land on the EXACT last spread of the previous section
              const lastSpreadScroll = Math.max(0, (prevTotalSpreads - 1) * sw);
              this.scrollTo(lastSpreadScroll, 0, true);
              this.container.scrollLeft = lastSpreadScroll;
              this.views?.show?.();
            }
            return val;
          })
          .catch((err: any) => {
            console.warn("origPrev caught error:", err);
            return undefined;
          });
      }
      return Promise.resolve();
    } catch (err) {
      console.warn("Synchronous error in origPrev:", err);
      return Promise.resolve();
    }
  };

  // 4. Hook into view rendered event to enforce even spread width & wrap expand
  const onRendered = (_section: any, view: any) => {
    try {
      wrapViewExpand(view);
      ensureEvenSpreadWidth(view, manager);

      const spreadWidth =
        manager.layout?.delta ||
        manager.layout?.width ||
        manager.container?.offsetWidth ||
        0;

      if (spreadWidth > 0 && manager.container) {
        const currentScroll = manager.container.scrollLeft || 0;
        const snappedScroll =
          Math.round(currentScroll / spreadWidth) * spreadWidth;
        if (Math.abs(currentScroll - snappedScroll) > 1) {
          manager.scrollTo(snappedScroll, 0, true);
          manager.container.scrollLeft = snappedScroll;
        }
      }
    } catch {}

    // Re-check when document fonts finish loading inside iframe
    try {
      const doc = view?.contents?.document || view?.document;
      if (doc?.fonts?.ready) {
        doc.fonts.ready
          .then(() => {
            wrapViewExpand(view);
            ensureEvenSpreadWidth(view, manager);
          })
          .catch(() => {});
      }
    } catch {}

    // Fallback timers for async font/image rendering
    setTimeout(() => {
      try {
        wrapViewExpand(view);
        ensureEvenSpreadWidth(view, manager);
      } catch {}
    }, 150);
    setTimeout(() => {
      try {
        wrapViewExpand(view);
        ensureEvenSpreadWidth(view, manager);
      } catch {}
    }, 500);
  };

  rendition.on("rendered", onRendered);

  // Return cleanup function
  return () => {
    try {
      rendition.off("rendered", onRendered);
      if (origDequeue && rendition.q) {
        rendition.q.dequeue = origDequeue;
      }
      if (origRun && rendition.q) {
        rendition.q.run = origRun;
      }
      manager.next = origNext;
      manager.prev = origPrev;
    } catch {}
  };
}

export function applyEpubPagingFix(rendition: any): () => void {
  if (!rendition) {
    return () => {};
  }

  let cleanupManager: (() => void) | null = null;
  let isCleanedUp = false;

  const attach = () => {
    if (isCleanedUp || cleanupManager || !rendition.manager) return;
    cleanupManager = setupManagerHooks(rendition, rendition.manager);
  };

  // 1. If manager is already instantiated, attach immediately
  if (rendition.manager) {
    attach();
  }

  // 2. If rendition has started promise, attach as soon as started resolves
  if (rendition.started && typeof rendition.started.then === "function") {
    rendition.started.then(attach).catch(() => {});
  }

  // 3. Fallback event listener on "started"
  if (typeof rendition.on === "function") {
    rendition.on("started", attach);
  }

  return () => {
    isCleanedUp = true;
    try {
      if (typeof rendition.off === "function") {
        rendition.off("started", attach);
      }
      cleanupManager?.();
    } catch {}
  };
}

