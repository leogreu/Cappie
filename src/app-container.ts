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
    },
    rotateX: {
        name: "Rotate (x-axis)",
        min: 0,
        max: 360,
        step: 1
    },
    rotateY: {
        name: "Rotate (y-axis)",
        min: 0,
        max: 360,
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
        scale: 0.5,
        radius: 10,
        shadow: 10,
        rotateX: 0,
        rotateY: 0
    };

    @state()
    file?: Base64File;

    // We'll store loaded images to avoid reloading them each time.
    private backgroundImage?: HTMLImageElement;
    private foregroundImage?: HTMLImageElement;

    static styles = css`
        :host {
            display: flex;
            padding: var(--size-8);
            gap: var(--size-8);
        }

        main {
            display: grid;
            place-items: center;
            flex: 2;
        }

        figure {
            display: grid;
            place-items: center;
            width: 100%;
            height: 100%;
            margin: 0;
            border-radius: var(--radius-lg);
            overflow: hidden;
        }

        /* The canvas will be drawn inside figure */
        canvas {
            display: block;
            max-width: 100%;
            height: auto;
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
                    ? html`
                        <figure>
                            <canvas></canvas>
                        </figure>
                    `
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
                    <app-group direction="column" gap="large">
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

    updated() {
        // Whenever the component updates, re-draw if we have images
        if (this.file) this.drawCanvas();
    }

    firstUpdated() {
        window.onresize = debounce(() => this.drawCanvas(), 50);
    }

    private async drawCanvas() {
        const canvas = this.get("canvas");
        const ctx = canvas.getContext("2d")!;

        // Determine aspect ratio for canvas sizing
        // We will take the width as the container's width and height according to ratio.
        let width = canvas.parentElement?.clientWidth || 800;
        let height = canvas.parentElement?.clientHeight || 600;

        // If ratio is set, compute height from width
        if (this.ratio) {
            const [w, h] = this.ratio.split('/').map(r => parseFloat(r.trim()));
            if (!isNaN(w) && !isNaN(h)) {
                const aspectRatio = w / h;
                height = width / aspectRatio;
            }
        }

        // Handle device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // Draw background image with blur
        if (this.backgroundImage) {
            const imageRatio = this.backgroundImage.width / this.backgroundImage.height;
            const targetRatio = width / height;

            let drawWidth, drawHeight;
            if (imageRatio > targetRatio) {
                drawHeight = height * 1.05;
                drawWidth = drawHeight * imageRatio;
            } else {
                drawWidth = width * 1.05;
                drawHeight = drawWidth / imageRatio;
            }

            const dx = (width - drawWidth) / 2;
            const dy = (height - drawHeight) / 2;

            ctx.save();
            ctx.filter = `blur(${this.transforms.blur}px)`;
            ctx.drawImage(this.backgroundImage, dx, dy, drawWidth, drawHeight);
            ctx.restore();
        }

        // Draw foreground with transformations
        if (this.foregroundImage) {
            // We'll translate to center, apply rotation, then translate back.
            const img = this.foregroundImage;
            const imgRatio = img.width / img.height;
            let fgWidth = width * 0.8; // foreground max width (arbitrary scale)
            let fgHeight = fgWidth / imgRatio;
            
            // Adjust for scale
            fgWidth *= this.transforms.scale;
            fgHeight *= this.transforms.scale;

            const centerX = width / 2;
            const centerY = height / 2;

            ctx.save();

            // Simulate a simple rotation. True 3D transforms are not directly possible in 2D canvas.
            // We'll just rotate by an average of rotateX and rotateY for demonstration.
            const rotationDeg = (this.transforms.rotateY - this.transforms.rotateX);
            const rotationRad = rotationDeg * Math.PI / 180;

            ctx.translate(centerX, centerY);
            ctx.rotate(rotationRad);

            // Apply shadow (approximate the effect of box-shadow)
            // We'll assume a downward shadow (like the original code with a vertical offset)
            ctx.shadowColor = 'black';
            ctx.shadowBlur = this.transforms.shadow * 2;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = this.transforms.shadow;

            // Apply border radius by clipping
            if (this.transforms.radius > 0) {
                this.roundRect(ctx, -fgWidth/2, -fgHeight/2, fgWidth, fgHeight, this.transforms.radius);
                ctx.clip();
            }

            ctx.drawImage(img, -fgWidth/2, -fgHeight/2, fgWidth, fgHeight);

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
        this.loadForegroundImage();
    }

    private handleBackgroundClick({ target }: MouseEvent) {
        const { id } = target as HTMLElement;
        this.background = Number(id);
        this.loadBackgroundImage();
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
        this.drawCanvas();
    }

    private loadBackgroundImage() {
        const bg = new Image();
        bg.src = BackgroundImages[this.background].previewPath;
        bg.onload = () => {
            this.backgroundImage = bg;
            this.requestUpdate(); // re-draw once loaded
        };
    }

    private loadForegroundImage() {
        if (!this.file) return;
        const fg = new Image();
        fg.src = `data:${this.file.mimeType};base64,${this.file.data}`;
        fg.onload = () => {
            this.foregroundImage = fg;
            this.loadBackgroundImage(); // ensure background is loaded as well
            this.requestUpdate();
        };
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-container": AppContainer;
    }
}
