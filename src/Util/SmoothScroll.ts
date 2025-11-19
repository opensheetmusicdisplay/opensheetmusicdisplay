/**
 * A simple smooth scroll implementation using requestAnimationFrame.
 * This avoids the native scrollIntoView "choppiness" on some mobile browsers.
 */
export class SmoothScroll {
    private static activeAnimations: Map<HTMLElement | Window, number> = new Map();

    /**
     * Smoothly scrolls the element into view.
     * @param element The element to scroll into view.
     * @param options Options for scrolling (duration, alignment).
     */
    public static scrollIntoView(element: HTMLElement, options: {
        duration?: number;
        block?: "start" | "center" | "end";
        inline?: "start" | "center" | "end";
    } = {}): void {
        const parent: HTMLElement | Window = SmoothScroll.getScrollParent(element);
        if (!parent) {
            return;
        }

        // Cancel any existing animation on this parent
        if (SmoothScroll.activeAnimations.has(parent)) {
            cancelAnimationFrame(SmoothScroll.activeAnimations.get(parent));
            SmoothScroll.activeAnimations.delete(parent);
        }

        const duration: number = options.duration || 400;

        // Get current scroll positions
        let startX: number;
        let startY: number;
        if (parent instanceof Window) {
            startX = window.scrollX;
            startY = window.scrollY;
        } else {
            startX = parent.scrollLeft;
            startY = parent.scrollTop;
        }

        const elemRect: DOMRect = element.getBoundingClientRect();
        let parentRect: DOMRect;
        let parentClientWidth: number;
        let parentClientHeight: number;

        if (parent instanceof Window) {
            parentRect = { left: 0, top: 0 } as DOMRect; // Relative to viewport
            parentClientWidth = window.innerWidth;
            parentClientHeight = window.innerHeight;
        } else {
            parentRect = parent.getBoundingClientRect();
            parentClientWidth = parent.clientWidth;
            parentClientHeight = parent.clientHeight;
        }

        // Calculate target Y (Vertical)
        let targetY: number = startY;
        if (options.block) {
            const relTop: number = elemRect.top - parentRect.top;
            if (options.block === "start") {
                targetY = startY + relTop;
            } else if (options.block === "center") {
                targetY = startY + relTop - (parentClientHeight / 2) + (elemRect.height / 2);
            } else if (options.block === "end") {
                targetY = startY + relTop - parentClientHeight + elemRect.height;
            }
        }

        // Calculate target X (Horizontal)
        let targetX: number = startX;
        if (options.inline) {
            const relLeft: number = elemRect.left - parentRect.left;
            if (options.inline === "start") {
                targetX = startX + relLeft;
            } else if (options.inline === "center") {
                targetX = startX + relLeft - (parentClientWidth / 2) + (elemRect.width / 2);
            } else if (options.inline === "end") {
                targetX = startX + relLeft - parentClientWidth + elemRect.width;
            }
        }

        // If already at target, do nothing
        if (Math.abs(targetX - startX) < 1 && Math.abs(targetY - startY) < 1) {
            return;
        }

        const startTime: number = performance.now();

        function step(currentTime: number): void {
            const elapsed: number = currentTime - startTime;
            const progress: number = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const ease: number = 1 - Math.pow(1 - progress, 3);

            const currentX: number = startX + (targetX - startX) * ease;
            const currentY: number = startY + (targetY - startY) * ease;

            if (parent instanceof Window) {
                parent.scrollTo(currentX, currentY);
            } else {
                const p: HTMLElement = parent as HTMLElement;
                p.scrollLeft = currentX;
                p.scrollTop = currentY;
            }

            if (progress < 1) {
                const nextAnimationId: number = requestAnimationFrame(step);
                SmoothScroll.activeAnimations.set(parent, nextAnimationId);
            } else {
                SmoothScroll.activeAnimations.delete(parent);
            }
        }

        const initialAnimationId: number = requestAnimationFrame(step);
        SmoothScroll.activeAnimations.set(parent, initialAnimationId);
    }

    private static getScrollParent(node: HTMLElement): HTMLElement | Window {
        if (!node) {
            return window;
        }

        let parent: HTMLElement = node.parentElement;
        while (parent) {
            const style: CSSStyleDeclaration = window.getComputedStyle(parent);
            const overflowY: string = style.overflowY;
            const overflowX: string = style.overflowX;

            const isScrollableY: boolean = (overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight;
            const isScrollableX: boolean = (overflowX === "auto" || overflowX === "scroll") && parent.scrollWidth > parent.clientWidth;

            if (isScrollableY || isScrollableX) {
                return parent;
            }
            parent = parent.parentElement;
        }

        return window;
    }
}
