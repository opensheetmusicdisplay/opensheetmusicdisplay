export interface ISystemVirtualizationOptions {
    /** The element that clips and scrolls the score. Defaults to window. */
    scrollElement?: HTMLElement | Window;
    /** Extra viewport heights kept mounted above and below the visible area. Defaults to 1. */
    overscanViewports?: number;
}

export interface ISystemVirtualizationStats {
    totalSystems: number;
    materializedSystems: number;
    attachedSystems: number;
    detachedSystems: number;
    unmaterializedSystems: number;
}

export interface IVirtualSystemDescriptor {
    key: string;
    svg: SVGSVGElement;
    top: number;
    bottom: number;
}

interface VirtualizedSystem {
    group: SVGGElement;
    anchor: Comment;
    svg: SVGSVGElement;
    top: number;
    bottom: number;
    attached: boolean;
}

interface VirtualizationViewport {
    top: number;
    bottom: number;
    height: number;
}

/**
 * Keeps only nearby music-system SVG groups in the live DOM. The groups themselves are retained and
 * reinserted, rather than recreated, so colors, opacity, listeners, and application-owned state survive.
 */
export class SystemVirtualizationController {
    private readonly container: HTMLElement;
    private readonly systems: Map<string, VirtualizedSystem> = new Map<string, VirtualizedSystem>();
    private readonly expectedSystems: Map<string, IVirtualSystemDescriptor> = new Map<string, IVirtualSystemDescriptor>();
    private enabled: boolean = false;
    private target: HTMLElement | Window | undefined;
    private overscanViewports: number = 1;
    private frameRequest: number | undefined;
    private materializeSystems: ((keys: string[]) => void) | undefined;

    public constructor(container: HTMLElement) {
        this.container = container;
    }

    public enable(options?: ISystemVirtualizationOptions): void {
        if (typeof window === "undefined") {
            return;
        }
        this.disableListeners();
        this.enabled = true;
        this.target = options?.scrollElement ?? window;
        this.overscanViewports = Math.max(0, options?.overscanViewports ?? 1);
        this.target.addEventListener("scroll", this.scheduleUpdate, { passive: true });
        window.addEventListener("resize", this.scheduleUpdate, { passive: true });
        this.refresh();
    }

    public disable(restore: boolean = true): void {
        this.enabled = false;
        this.disableListeners();
        if (restore) {
            for (const system of this.systems.values()) {
                this.attach(system);
            }
        }
    }

    /** Register the full laid-out score, including systems that have not been drawn yet. */
    public configureExpectedSystems(
        systems: IVirtualSystemDescriptor[],
        materialize: (keys: string[]) => void
    ): void {
        this.expectedSystems.clear();
        for (const system of systems) {
            this.expectedSystems.set(system.key, system);
        }
        this.materializeSystems = materialize;
        this.refresh();
    }

    /** Drop references before OSMD destroys/replaces a backend. */
    public invalidate(): void {
        if (this.frameRequest !== undefined && typeof window !== "undefined") {
            window.cancelAnimationFrame(this.frameRequest);
        }
        this.frameRequest = undefined;
        this.systems.clear();
        this.expectedSystems.clear();
        this.materializeSystems = undefined;
    }

    /** Discover newly rendered systems, then apply the current viewport window. */
    public refresh(): void {
        if (!this.enabled || typeof document === "undefined") {
            return;
        }
        this.discoverRenderedSystems();
        this.updateNow();
    }

    private discoverRenderedSystems(): void {
        const groups: NodeListOf<SVGGElement> =
            this.container.querySelectorAll<SVGGElement>("g.osmd-system[data-osmd-system-key]");
        for (const group of Array.from(groups)) {
            const key: string = group.dataset.osmdSystemKey;
            if (!key || this.systems.has(key)) {
                continue;
            }
            const svg: SVGSVGElement = group.ownerSVGElement;
            if (!svg || !group.parentNode) {
                continue;
            }
            const anchor: Comment = document.createComment(`osmd-system:${key}`);
            group.parentNode.insertBefore(anchor, group);
            const top: number = Number.parseFloat(group.dataset.osmdSystemTop ?? "");
            const bottom: number = Number.parseFloat(group.dataset.osmdSystemBottom ?? "");
            if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
                anchor.remove();
                continue;
            }
            this.systems.set(key, { group, anchor, svg, top, bottom, attached: true });
        }
    }

    public updateNow(): void {
        if (!this.enabled || (this.systems.size === 0 && this.expectedSystems.size === 0)) {
            return;
        }
        const viewport: VirtualizationViewport = this.getViewport();
        if (viewport.height <= 0) {
            return;
        }
        const minY: number = viewport.top - viewport.height * this.overscanViewports;
        const maxY: number = viewport.bottom + viewport.height * this.overscanViewports;
        const missingVisibleKeys: string[] = [];
        for (const expected of this.expectedSystems.values()) {
            if (this.systems.has(expected.key)) {
                continue;
            }
            const matrix: DOMMatrix = expected.svg.getScreenCTM();
            if (!matrix) {
                continue;
            }
            const top: number = new DOMPoint(0, expected.top).matrixTransform(matrix).y;
            const bottom: number = new DOMPoint(0, expected.bottom).matrixTransform(matrix).y;
            if (bottom >= minY && top <= maxY) {
                missingVisibleKeys.push(expected.key);
            }
        }
        if (missingVisibleKeys.length > 0 && this.materializeSystems) {
            this.materializeSystems(missingVisibleKeys);
            this.discoverRenderedSystems();
        }
        for (const system of this.systems.values()) {
            const matrix: DOMMatrix = system.svg.getScreenCTM();
            if (!matrix) {
                this.attach(system);
                continue;
            }
            const top: number = new DOMPoint(0, system.top).matrixTransform(matrix).y;
            const bottom: number = new DOMPoint(0, system.bottom).matrixTransform(matrix).y;
            if (bottom >= minY && top <= maxY) {
                this.attach(system);
            } else {
                this.detach(system);
            }
        }
    }

    public get stats(): ISystemVirtualizationStats {
        let attachedSystems: number = 0;
        for (const system of this.systems.values()) {
            if (system.attached) {
                attachedSystems++;
            }
        }
        return {
            totalSystems: Math.max(this.expectedSystems.size, this.systems.size),
            materializedSystems: this.systems.size,
            attachedSystems,
            detachedSystems: this.systems.size - attachedSystems,
            unmaterializedSystems: Math.max(0, this.expectedSystems.size - this.systems.size)
        };
    }

    private readonly scheduleUpdate: () => void = (): void => {
        if (!this.enabled || this.frameRequest !== undefined) {
            return;
        }
        this.frameRequest = window.requestAnimationFrame((): void => {
            this.frameRequest = undefined;
            this.updateNow();
        });
    };

    private getViewport(): VirtualizationViewport {
        if (!this.target || this.target === window) {
            return { top: 0, bottom: window.innerHeight, height: window.innerHeight };
        }
        const rect: DOMRect = (this.target as HTMLElement).getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
    }

    private attach(system: VirtualizedSystem): void {
        if (system.attached) {
            return;
        }
        system.anchor.parentNode?.insertBefore(system.group, system.anchor.nextSibling);
        system.attached = true;
    }

    private detach(system: VirtualizedSystem): void {
        if (!system.attached) {
            return;
        }
        system.group.remove();
        system.attached = false;
    }

    private disableListeners(): void {
        if (typeof window === "undefined") {
            return;
        }
        this.target?.removeEventListener("scroll", this.scheduleUpdate);
        window.removeEventListener("resize", this.scheduleUpdate);
        if (this.frameRequest !== undefined) {
            window.cancelAnimationFrame(this.frameRequest);
            this.frameRequest = undefined;
        }
    }
}
