import { AppComponent, customElement, state, css, html } from "./components/base/app-component.ts";
import { debounce } from "utils/debounce.ts";
import type { Base64File } from "utils/files.ts";

// Import all components to be used without import
import.meta.glob("./components/**/*.ts", { eager: true });

const TransformOptions: {
    [key: string]: {
        name: string;
        min: number;
        max: number;
        step: number;
    };
} = {
    blur: {
        name: "Blur",
        min: 0,
        max: 10,
        step: 0.5
    },
    scale: {
        name: "Scale",
        min: 0,
        max: 1,
        step: 0.01
    },
    radius: {
        name: "Radius",
        min: 0,
        max: 50,
        step: 1
    },
    shadow: {
        name: "Shadow",
        min: 0,
        max: 25,
        step: 1
    }
};

const AspectRatios = ["", "1 / 1", "4 / 3", "16 / 9"];

const BackgroundImages: {
    path: string;
    previewPath: string;
}[] = [
    {
        path: "/background-1.jpg",
        previewPath: "/background-1.jpg"
    },
    {
        path: "/background-2.jpg",
        previewPath: "/background-2.jpg"
    },
    {
        path: "/background-3.jpg",
        previewPath: "/background-3.jpg"
    }
];

@customElement("app-container")
export class AppContainer extends AppComponent {
    @state()
    background = 0;

    @state()
    ratio = AspectRatios[0];

    @state()
    transforms: Record<string, number> = {
        blur: 0,
        scale: 0.75,
        radius: 10,
        shadow: 10
    };

    @state()
    file?: Base64File;

    @state()
    backgroundImage?: HTMLImageElement;

    @state()
    foregroundImage?: HTMLImageElement;

    static styles = css`
        :host {
            display: flex;
            padding: var(--size-8);
            gap: var(--size-8);
        }

        main {
            display: grid;
            place-items: center;
            flex: 2.5;
            background-color: var(--surface-2);
            border-radius: var(--radius-lg);
            overflow: hidden;
        }

        canvas {
            max-width: 100%;
            max-height: 100%;
        }

        file-dropzone {
            display: flex;
            height: 100%;
            width: 100%;
        }

        aside {
            flex: 1;
        }

        app-card {
            height: 100%;
        }

        [direction=grid] {
            --min-width: 5rem;
        }
    `;

    render() {
        return html`
            <main>
                ${this.file
                    ? html`<canvas></canvas>`
                    : html`
                        <file-dropzone type="base64Binary" @file-input=${this.handleFileInput}>
                            Drag-and-drop image or click to select
                        </file-dropzone>
                    `
                }
            </main>
            <aside>
                <app-card>
                    <app-text slot="title">
                        Options
                    </app-text>
                    <app-group direction="column" gap="huge">
                        <app-group direction="column">
                            <app-paragraph bold>
                                Background
                            </app-paragraph>
                            <app-group direction="grid" @click=${this.handleBackgroundClick}>
                                ${BackgroundImages.map((image, index) => html`
                                    <image-button
                                        id=${index}
                                        src=${image.previewPath}
                                        ?checked=${index === this.background}
                                    ></image-button>
                                `)}
                            </app-group>
                        </app-group>
                        <app-group direction="column">
                            <app-paragraph bold>
                                Ratio
                            </app-paragraph>
                            <app-group @click=${this.handleRatioClick}>
                                ${AspectRatios.map(ratio => html`
                                    <app-button
                                        id=${ratio}
                                        ?checked=${ratio === this.ratio}
                                        fullwidth
                                    >
                                        ${ratio ? ratio.replace(" / ", ":") : "Responsive"}
                                    </app-button>
                                `)}
                            </app-group>
                        </app-group>
                        ${Object.entries(TransformOptions).map(([key, value]) => html`
                            <app-slider
                                name=${key}
                                type="range"
                                min=${value.min}
                                max=${value.max}
                                step=${value.step}
                                value=${this.transforms[key]}
                                @input=${this.handleNumericInput}
                            >
                                ${value.name}
                            </app-slider>
                        `)}
                    </app-group>
                </app-card>
            </aside>
        `;
    }

    updated(properties: Map<string, unknown>) {
        if (properties.has("file") || properties.has("background")) {
            if (properties.has("file")) this.loadForegroundImage();
            this.loadBackgroundImage();
        }

        this.drawCanvas();
    }

    firstUpdated() {
        window.onresize = debounce(() => this.drawCanvas(), 50);
    }

    private async drawCanvas() {
        const canvas = this.get("canvas");
        const ctx = canvas.getContext("2d")!;

        // Determine canvas dimensions
        let width = canvas.parentElement?.clientWidth || 800;
        let height = canvas.parentElement?.clientHeight || 600;

        if (this.ratio) {
            const [w, h] = this.ratio.split("/").map(Number);
            if (w && h) {
                const aspectRatio = w / h;
                const desiredHeight = width / aspectRatio;

                if (desiredHeight > height) {
                    width = height * aspectRatio;
                } else {
                    height = desiredHeight;
                }
            }
        }

        // Set canvas resolution with device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // Draw background if available
        if (this.backgroundImage) {
            const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
            const canvasRatio = width / height;

            const drawWidth = imgRatio > canvasRatio ? height * imgRatio * 1.05 : width * 1.05;
            const drawHeight = imgRatio > canvasRatio ? height * 1.05 : width / imgRatio * 1.05;
            const dx = (width - drawWidth) / 2;
            const dy = (height - drawHeight) / 2;

            ctx.save();
            ctx.filter = `blur(${this.transforms.blur}px)`;
            ctx.drawImage(this.backgroundImage, dx, dy, drawWidth, drawHeight);
            ctx.restore();
        }

        // Draw foreground if available
        if (this.foregroundImage) {
            const img = this.foregroundImage;
            const imgRatio = img.width / img.height;

            // Calculate scaled dimensions while preserving aspect ratio
            const drawHeight = Math.min(height, (width / imgRatio)) * this.transforms.scale;
            const drawWidth = drawHeight * imgRatio;

            ctx.save();
            ctx.translate(width / 2, height / 2);

            // Draw rounded rectangle with shadow and clipping
            this.roundRect(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, this.transforms.radius);

            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = this.transforms.shadow * 2;
            ctx.shadowOffsetY = this.transforms.shadow;

            ctx.fill();
            ctx.clip();
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

            ctx.restore();
        }
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    private handleFileInput({ detail }: CustomEvent<Base64File>) {
        this.file = detail;
    }

    private handleBackgroundClick({ target }: MouseEvent) {
        const { id } = target as HTMLElement;
        this.background = Number(id);
    }

    private handleRatioClick({ target }: MouseEvent) {
        const { id } = target as HTMLElement;
        this.ratio = id;
    }

    private handleNumericInput({ target }: InputEvent) {
        const { name, value } = target as HTMLInputElement;
        this.transforms = {
            ...this.transforms,
            [name]: Number(value)
        };
    }

    private loadBackgroundImage() {
        const image = new Image();
        image.src = BackgroundImages[this.background].previewPath;
        image.onload = () => this.backgroundImage = image;
    }

    private loadForegroundImage() {
        if (!this.file) return;
        const image = new Image();
        image.src = `data:${this.file.mimeType};base64,${this.file.data}`;
        image.onload = () => this.foregroundImage = image;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-container": AppContainer;
    }
}
