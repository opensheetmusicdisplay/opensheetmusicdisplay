import { EngravingRules } from "./EngravingRules";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
import {
    ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration,
    ISkyBottomLineBatchCalculatorBackendTableConfiguration,
    SkyBottomLineBatchCalculatorBackend
} from "./SkyBottomLineBatchCalculatorBackend";
import vertexShaderSource from "./Shaders/VertexShader.glsl";
import fragmentShaderSource from "./Shaders/FragmentShader.glsl";
import log from "loglevel";

// WebGL helper functions

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader: WebGLProgram = gl.createShader(type);
    if (!shader) {
        log.warn("WebGLSkyBottomLineCalculatorBackend: Could not create a WebGL shader");
        throw new Error("Could not create a WebGL shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        log.warn("Shader compilation failed\n" + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error("WebGL shader compilation failed");
    }

    return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program: WebGLProgram = gl.createProgram();
    if (!program) {
        log.warn("WebGLSkyBottomLineCalculatorBackend: Could not create a WebGL program");
        throw new Error("Could not create a WebGL program");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        log.warn("WebGLSkyBottomLineCalculatorBackend: WebGL program link failed\n" + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        throw new Error("WebGL program link failed");
    }
    return program;
}

function createVertexBuffer(gl: WebGLRenderingContext, program: WebGLShader, attributeName: string, vertices: [number, number][]): WebGLBuffer {
    const vertexBuffer: WebGLBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        log.warn("WebGLSkyBottomLineCalculatorBackend: WebGL buffer creation failed");
        throw new Error("WebGL buffer creation failed");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices.flat()), gl.STATIC_DRAW);
    gl.useProgram(program);

    const positionAttributeLocation: number = gl.getAttribLocation(program, attributeName);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false, // no nomralization
        0,     // stride = 0
        0,     // offset = 0
    );

    return vertexBuffer;
}

function createTexture(gl: WebGLRenderingContext, program: WebGLShader, textureIdx: number, uniformName: string): WebGLTexture {
    const texture: WebGLTexture = gl.createTexture();
    if (!texture) {
        log.warn("WebGLSkyBottomLineCalculatorBackend: WebGL texture creation failed");
        throw new Error("WebGL texture creation failed");
    }

    gl.activeTexture(gl.TEXTURE0 + textureIdx);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const uniformLocation: WebGLUniformLocation = gl.getUniformLocation(program, uniformName);
    if (!uniformLocation) {
        log.warn("WebGLSkyBottomLineCalculatorBackend: WebGL invalid uniform name");
        throw new Error("WebGL invalid uniform name");
    }
    gl.uniform1i(uniformLocation, textureIdx);

    return texture;
}

/**
 * This class calculates the skylines and the bottom lines by using WebGL acceleration.
 */
export class WebGLSkyBottomLineBatchCalculatorBackend extends SkyBottomLineBatchCalculatorBackend {
    private gl: WebGLRenderingContext;
    private texture: WebGLTexture;

    constructor(rules: EngravingRules, measures: VexFlowMeasure[]) {
        super(rules, measures);
    }

    protected getPreferredRenderingConfiguration(maxWidth: number, elementHeight: number): ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration {

        (<any>window).console.log("a: ", maxWidth, elementHeight);

        return {
            elementWidth: Math.ceil(maxWidth),
            numColumns: 5,
            numRows: 5,
        };
    }

    protected onInitialize(tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration): void {

        (<any>window).console.log("b: ", tableConfiguration);

        const { elementWidth, numColumns, numRows } = tableConfiguration;
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = elementWidth * numColumns;
        canvas.height = numRows;

        const gl: WebGLRenderingContext = canvas.getContext("webgl");
        if (!gl) {
            log.warn("WebGLSkyBottomLineCalculatorBackend: No WebGL support");
            throw new Error("No WebGL support");
        }
        this.gl = gl;

        const vertexShader: WebGLShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader: WebGLShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program: WebGLProgram = createProgram(gl, vertexShader, fragmentShader);
        createVertexBuffer(gl, program, "a_position", [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, -1],
            [1, 1],
            [-1, 1],
        ]);
        this.texture = createTexture(gl, program, 0, "u_image");
    }

    protected calculateFromCanvas(
        canvas: HTMLCanvasElement,
        vexFlowContext: Vex.Flow.CanvasContext,
        measures: VexFlowMeasure[],
        samplingUnit: number,
        tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration
    ): SkyBottomLineCalculationResult[] {
        const debugTmpCanvas: boolean = false;

        const gl: WebGLRenderingContext = this.gl;

        const context: CanvasRenderingContext2D = vexFlowContext as unknown as CanvasRenderingContext2D;
        const rgbaLength: number = 4;
        const { elementWidth, elementHeight, numColumns } = tableConfiguration;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        const pixels: Uint8Array = new Uint8Array(gl.canvas.width * gl.canvas.height * rgbaLength);
        gl.readPixels(0, 0, gl.canvas.width, gl.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        (<any>window).console.log(pixels, gl, canvas, context);

        const result: SkyBottomLineCalculationResult[] = [];
        for (let i: number = 0; i < measures.length; ++i) {
            const measure: VexFlowMeasure = measures[i];
            const measureWidth: number = Math.floor(measure.getVFStave().getWidth());
            const measureArrayLength: number =  Math.max(Math.ceil(measure.PositionAndShape.Size.width * samplingUnit), 1);
            const u: number = i % numColumns;
            const v: number = Math.floor(i / numColumns);

            const xOffset: number = u * elementWidth * rgbaLength;
            const yOffset: number = v * elementWidth * numColumns * rgbaLength;

            const skyLine: number[] = new Array(Math.max(measureArrayLength, measureWidth)).fill(0);
            const bottomLine: number[] = new Array(Math.max(measureArrayLength, measureWidth)).fill(0);

            for (let x: number = 0; x < measureWidth; ++x) {
                skyLine[x] = Math.floor(pixels[x * rgbaLength + xOffset + yOffset] / 255 * elementHeight);
                bottomLine[x] = Math.floor(pixels[x * rgbaLength + xOffset + yOffset + 1] / 255 * elementHeight);
            }

            if (debugTmpCanvas) {
                const xStart: number = u * elementWidth;
                const yStart: number = v * elementHeight;

                const oldFillStyle: string | CanvasGradient | CanvasPattern = context.fillStyle;
                context.fillStyle = "#FF0000";
                skyLine.forEach((y, x) => context.fillRect(x - 1 + xStart, y - 1 + yStart, 2, 2));
                context.fillStyle = "#0000FF";
                bottomLine.forEach((y, x) => context.fillRect(x - 1 + xStart, y - 1 + yStart, 2, 2));
                context.fillStyle = oldFillStyle;
            }

            result.push(new SkyBottomLineCalculationResult(skyLine, bottomLine));
        }

        if (debugTmpCanvas) {
            const url: string = canvas.toDataURL("image/png");
            const img: HTMLImageElement = document.createElement("img");
            img.src = url;
            document.body.appendChild(img);
        }

        return result;
    }
}
