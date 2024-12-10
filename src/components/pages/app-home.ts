import { AppComponent, customElement, state, css, html } from "components/base/app-component.ts";
import { downloadObjectURL, uploadFile, type Base64File } from "utils/files.ts";
import { debounce } from "utils/debounce.ts";
import { all } from "persistence/controller/lit-controller.ts";
import { ComposedImage, TransformOptions, TransformDefaults, AspectRatios } from "../../models/composed-image.ts";
import { FileUpload } from "../../models/file-upload.ts";
import type { RouterLocation } from "@vaadin/router";

const BackgroundImages: {
    [key: string]: {
        path: string;
        previewPath: string;
    };
} = Object.fromEntries(
    Array.from({ length: 5 }).map((_, index) => [
        String(index + 1),
        {
            path: `/backgrounds/${index + 1}.jpg`,
            previewPath: `/backgrounds/${index + 1}_small.jpg`,
        }
    ])
);

@customElement("app-home")
export class AppHome extends AppComponent {
    @state()
    composition?: ComposedImage;

    @all(FileUpload.where({ type: "background" }).sort("createdDate").asc())
    backgrounds: FileUpload[] = [];

    // Keep references for performance reasons
    backgroundImage?: HTMLImageElement;
    foregroundImage?: HTMLImageElement;

    static styles = css`
        :host {
            display: flex;
            flex: 1;
            padding: var(--size-8);
            gap: var(--size-8);
        }

        main {
            display: grid;
            place-items: center;
            flex: 2.5;
        }

        canvas {
            max-width: 100%;
            max-height: 100%;
            border-radius: var(--radius-lg);
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
                ${this.composition
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
                    <app-title size="tiny" slot="title">
                        Options
                    </app-title>
                    <icon-button
                        slot="action"
                        name="arrow-rotate-left-regular"
                        @click=${this.handleResetClick}
                    ></icon-button>
                    <app-group direction="column" gap="huge">
                        <app-group direction="column">
                            <app-paragraph bold>
                                Background
                            </app-paragraph>
                            <app-group direction="grid" @click=${this.handleBackgroundClick}>
                                ${Object.entries(BackgroundImages).map(([key, value]) => html`
                                    <image-button
                                        id=${key}
                                        ?checked=${key === this.composition?.background}
                                    >
                                        <img src=${value.previewPath}>
                                    </image-button>
                                `)}
                                ${this.backgrounds.map(image => html`
                                    <image-button
                                        id=${image.uuid}
                                        ?checked=${image.uuid === this.composition?.background}
                                        deletable
                                        @delete-image=${this.handleDeleteImage}
                                    >
                                        <img src=${image.dataURL}>
                                    </image-button>
                                `)}
                                <app-button id="new" fullwidth style="aspect-ratio: 16 / 9;">
                                    <app-icon name="plus-regular"></app-icon>
                                </app-button>
                            </app-group>
                        </app-group>
                        <app-group direction="column">
                            <app-group justify="space-between" style="align-items: end;">
                                <app-paragraph bold>
                                    Ratio
                                </app-paragraph>
                                <icon-button
                                    name="rectangle-regular"
                                    size="small"
                                    style="
                                        rotate: ${this.composition?.portrait? '90' : '0'}deg;
                                        transition: rotate var(--duration-long);
                                    "
                                    @click=${this.handlePortraitClick}
                                ></icon-button>
                            </app-group>
                            <app-group @click=${this.handleRatioClick}>
                                ${AspectRatios.map(ratio => html`
                                    <app-button
                                        id=${ratio}
                                        size="small"
                                        ?checked=${ratio === this.composition?.ratio}
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
                                value=${this.composition?.transforms[key] ?? TransformDefaults[key]}
                                @input=${this.handleNumericInput}
                            >
                                ${value.name}
                            </app-slider>
                        `)}
                    </app-group>
                    <app-group slot="footer">
                        <app-button size="small" fullwidth @click=${this.handleDownloadClick}>
                            <app-icon name="arrow-down-to-line-regular"></app-icon>
                            <app-text>Download</app-text>
                        </app-button>
                        <app-button size="small" fullwidth light @click=${this.handleRemoveClick}>
                            <app-icon name="trash-regular"></app-icon>
                            <app-text>Remove</app-text>
                        </app-button>
                    </app-group>
                </app-card>
            </aside>
        `;
    }

    updated(properties: Map<string, unknown>) {
        if (properties.has("composition")) {
            this.loadForegroundImage();
            this.loadBackgroundImage();
        }
    }

    firstUpdated() {
        window.onresize = debounce(() => this.drawCanvas(), 50);
    }

    private async drawCanvas() {
        const canvas = this.find("canvas");
        const ctx = canvas?.getContext("2d");
        if (!this.composition || !canvas || !ctx) return;

        // Determine canvas dimensions
        let width = canvas.parentElement?.clientWidth || 800;
        let height = canvas.parentElement?.clientHeight || 600;

        if (this.composition.ratio) {
            const numbers = this.composition.ratio.split("/").map(Number);
            if (this.composition.portrait) numbers.reverse();

            const [w, h] = numbers;
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
            ctx.filter = `blur(${this.composition.transforms.blur}px)`;
            ctx.drawImage(this.backgroundImage, dx, dy, drawWidth, drawHeight);
            ctx.restore();
        }

        // Draw foreground if available
        if (this.foregroundImage) {
            const img = this.foregroundImage;
            const imgRatio = img.width / img.height;

            // Calculate scaled dimensions while preserving aspect ratio
            const drawHeight = Math.min(height, (width / imgRatio)) * this.composition.transforms.scale;
            const drawWidth = drawHeight * imgRatio;

            ctx.save();
            ctx.translate(width / 2, height / 2);

            // Draw rounded rectangle with shadow and clipping
            this.roundRect(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, this.composition.transforms.radius);

            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = this.composition.transforms.shadow * 2;
            ctx.shadowOffsetY = this.composition.transforms.shadow;
            ctx.fillStyle = "white";

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

    private async handleFileInput({ detail }: CustomEvent<Base64File>) {
        const { name, mimeType, size, data } = detail;
        const file = await new FileUpload("screenshot", name, mimeType, size, data).commit();

        this.composition = new ComposedImage(file.reference, Object.keys(BackgroundImages)[0]);
        this.commit();
    }

    private handleResetClick() {
        if (!this.composition) return;

        this.composition.transforms = { ...TransformDefaults };
        this.updateAndCommit();
    }

    private async handleBackgroundClick({ target }: MouseEvent) {
        if (!this.composition) return;

        const { id } = target as HTMLElement;
        if (id === "new") {
            const { name, mimeType, size, data } = await uploadFile("base64Binary");
            const image = await new FileUpload("background", name, mimeType, size, data).commit();
            this.composition.background = image.uuid;
        } else if (id) {
            this.composition.background = id;
        }

        this.loadBackgroundImage();
        this.updateAndCommit();
    }

    private handleDeleteImage({ detail }: CustomEvent<string>) {
        document.createElement("app-dialog").show({
            title: "Please confirm",
            text: "Do you really want to delete the image?",
            actions: {
                Delete: () => {
                    this.backgrounds.find(image => image.uuid === detail)?.delete();
                    if (this.composition?.background === detail) {
                        this.composition.background = Object.keys(BackgroundImages)[0];
                        this.updateAndCommit();
                    }
                }
            }
        });
    }

    private handleRatioClick({ target }: MouseEvent) {
        if (!this.composition) return;

        const { id } = target as HTMLElement;
        this.composition.ratio = id;
        this.updateAndCommit();
    }

    private handlePortraitClick() {
        if (!this.composition) return;

        this.composition.portrait = !this.composition.portrait;
        this.updateAndCommit();
    }

    private handleNumericInput({ target }: InputEvent) {
        if (!this.composition) return;

        const { name, value } = target as HTMLInputElement;
        this.composition.transforms[name] = Number(value);
        this.updateAndCommit();
    }

    private handleDownloadClick() {
        const url = this.get("canvas").toDataURL("image/jpeg", 0.9);
        downloadObjectURL(url, "Cappie-Export");
    }

    private handleRemoveClick() {
        this.composition = undefined;
    }

    private loadBackgroundImage() {
        if (!this.composition) return;

        const src = BackgroundImages[this.composition.background]?.path
            ?? this.backgrounds.find(image => image.uuid === this.composition?.background)?.dataURL;
        if (!src) return;

        const image = new Image();
        image.src = src;
        image.onload = () => {
            this.backgroundImage = image;
            this.drawCanvas();
        }
    }

    private async loadForegroundImage() {
        if (!this.composition) return;

        const file = await this.composition.image.data;
        const image = new Image();
        image.src = file.dataURL;
        image.onload = () => {
            this.foregroundImage = image;
            this.drawCanvas();
        }
    }

    private async updateAndCommit() {
        this.requestUpdate();
        this.drawCanvas();
        this.commit();
    }

    private commit = debounce(() => {
        if (!this.composition) return;
        // TODO: Reduce size
        this.composition.preview = this.get("canvas").toDataURL("image/jpeg", 0.8);
        this.composition.commit();
    }, 1000);

    async onBeforeEnter(location: RouterLocation) { 
        this.composition = await ComposedImage.where({ uuid: location.params.uuid as string }).first();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-home": AppHome;
    }
}
