import { expect } from "chai";
import { SystemVirtualizationController } from "../../src/OpenSheetMusicDisplay/SystemVirtualizationController";

describe("SystemVirtualizationController", () => {
    it("detaches distant systems and restores the same stateful SVG nodes", () => {
        const container: HTMLDivElement = document.createElement("div");
        const scrollElement: HTMLDivElement = document.createElement("div");
        const svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        document.body.appendChild(scrollElement);
        scrollElement.appendChild(container);
        container.appendChild(svg);

        let scrollTop: number = 0;
        scrollElement.getBoundingClientRect = (): DOMRect => ({
            x: 0, y: 0, top: 0, right: 100, bottom: 100,
            left: 0, width: 100, height: 100, toJSON: (): object => ({})
        });
        svg.getScreenCTM = (): DOMMatrix => new DOMMatrix().translate(0, -scrollTop);

        const makeSystem: (key: string, top: number) => SVGGElement = (key: string, top: number): SVGGElement => {
            const group: SVGGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.classList.add("osmd-system");
            group.dataset.osmdSystemKey = key;
            group.dataset.osmdSystemTop = top.toString();
            group.dataset.osmdSystemBottom = (top + 50).toString();
            svg.appendChild(group);
            return group;
        };
        const first: SVGGElement = makeSystem("1:0", 0);
        const distant: SVGGElement = makeSystem("1:1", 500);
        distant.style.opacity = "0.42";
        let clicks: number = 0;
        distant.addEventListener("click", (): number => ++clicks);

        const controller: SystemVirtualizationController = new SystemVirtualizationController(container);
        controller.enable({ scrollElement, overscanViewports: 0 });
        expect(first.isConnected).to.equal(true);
        expect(distant.isConnected).to.equal(false);
        expect(controller.stats).to.deep.equal({
            totalSystems: 2,
            materializedSystems: 2,
            attachedSystems: 1,
            detachedSystems: 1,
            unmaterializedSystems: 0
        });

        scrollTop = 450;
        controller.updateNow();
        expect(first.isConnected).to.equal(false);
        expect(distant.isConnected).to.equal(true);
        expect(distant.style.opacity).to.equal("0.42");
        distant.dispatchEvent(new MouseEvent("click"));
        expect(clicks).to.equal(1);

        controller.disable();
        expect(first.isConnected).to.equal(true);
        expect(distant.isConnected).to.equal(true);
        scrollElement.remove();
    });
});
