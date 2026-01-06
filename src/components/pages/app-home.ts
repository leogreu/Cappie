import { AppComponent, customElement, state, css, html } from "components/base/app-component.ts";
import { downloadObjectURL, uploadFile, type Base64File } from "utils/files.ts";
import { debounce } from "utils/debounce.ts";
import { all } from "persistence/controller/lit-controller.ts";
import { ComposedImage, TransformOptions, TransformDefaults, AspectRatios } from "../../models/composed-image.ts";
import { FileUpload } from "../../models/file-upload.ts";
import { Router, type RouterLocation } from "@vaadin/router";

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

    @state()
    error?: "safari-canvas-filters";

    @all(FileUpload.where({ type: "background" }).sort("createdDate").asc())
    backgrounds?: FileUpload[];

    @state()
    screenshots: FileUpload[] = [];

    // Keep references for performance reasons
    backgroundImage?: HTMLImageElement;
    foregroundImages: HTMLImageElement[] = [];

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
                            Drop, paste, or click to select an image
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
                                Screenshots
                            </app-paragraph>
                            <app-group direction="grid" @click=${this.handleScreenshotClick}>
                                ${this.screenshots.map(image => html`
                                    <image-button
                                        id=${image.uuid}
                                        deletable
                                        @delete-image=${this.handleDeleteScreenshot}
                                    >
                                        <img src=${image.dataURL}>
                                    </image-button>
                                `)}
                                <app-button id="new-screenshot" fullwidth style="aspect-ratio: 16 / 9;">
                                    <app-icon name="plus-regular"></app-icon>
                                </app-button>
                                <div></div>
                                <div></div>
                                <div></div>
                            </app-group>
                        </app-group>
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
                                ${this.backgrounds?.map(image => html`
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
                        ${this.error && html`
                            <app-notification type="danger">
                                <app-text slot="title">Safari without Canvas Filters</app-text>
                                <app-text slot="text">Safari is currently the only browser without enabled Canvas Filters by default. To enable it, click on 'Safari' in the top left menu bar, then 'Settings', 'Feature Flags', search for 'Canvas' and enable 'Canvas Filters'. Then, please reload the page.</app-text>
                            </app-notification>
                        `}
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
                        <app-dropdown horizontal="left" vertical="top" fullwidth>
                            <app-button slot="trigger" size="small" fullwidth>
                                <app-icon name="arrow-down-to-line-regular"></app-icon>
                                <app-text>Export</app-text>
                            </app-button>
                            <app-menu slot="content" @item-click=${this.handleExportClick}>
                                <menu-item value="copy-url">
                                    <app-icon name="cloud-regular"></app-icon>
                                    <app-text>Upload image and copy link</app-text>
                                </menu-item>
                                <menu-item value="copy-image">
                                    <app-icon name="copy-regular"></app-icon>
                                    <app-text>Copy image to clipboard</app-text>
                                </menu-item>
                                <menu-item value="download-image">
                                    <app-icon name="arrow-down-to-line-regular"></app-icon>
                                    <app-text>Download image</app-text>
                                </menu-item>
                            </app-menu>
                        </app-dropdown>
                        <a href="/home" style="width: 100%;">
                            <app-button size="small" fullwidth light>
                                <app-icon name="plus-regular"></app-icon>
                                <app-text>New</app-text>
                            </app-button>
                        </a>
                    </app-group>
                </app-card>
            </aside>
        `;
    }

    private drawCanvas = () => {
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
        const dpr = Math.max(window.devicePixelRatio, 2);
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
        if (this.foregroundImages.length > 0) {
            const totalImages = this.foregroundImages.length;
            const spacing = this.composition.transforms.spacing;
            
            // Calculate available dimensions
            const availableWidth = width * this.composition.transforms.scale;
            const availableHeight = height * this.composition.transforms.scale;
            
            // When spacing is 1, images are side by side with gaps
            // When spacing is 0, images are fully overlapped at center
            const maxGap = 20; // Maximum gap between images in pixels
            const fullGap = (totalImages - 1) * maxGap;
            
            // Calculate the first image's aspect ratio
            const firstImg = this.foregroundImages[0];
            const imgRatio = firstImg.width / firstImg.height;
            
            // Calculate image width based on spacing
            // At spacing=0 (overlapped): each image uses full available width
            // At spacing=1 (spread): images share the available width with gaps
            const widthWhenOverlapped = availableWidth;
            const widthWhenSpread = (availableWidth - fullGap) / totalImages;
            let imageWidth = widthWhenOverlapped + spacing * (widthWhenSpread - widthWhenOverlapped);
            let imageHeight = imageWidth / imgRatio;
            
            // Constrain by height if needed
            if (imageHeight > availableHeight) {
                imageHeight = availableHeight;
                imageWidth = imageHeight * imgRatio;
            }
            
            // Calculate fully spread positions (centered around 0)
            // Use the spread width for positioning calculations
            const fullSpreadWidth = (widthWhenSpread * totalImages) + fullGap;
            const startXFullSpread = -fullSpreadWidth / 2;
            
            const radius = this.composition.transforms.radius;
            const shadow = this.composition.transforms.shadow;
            
            ctx.save();
            ctx.translate(width / 2, height / 2);
            
            // Draw each screenshot
            this.foregroundImages.forEach((img, index) => {
                // Calculate center position when fully spread
                const xCenterFullSpread = startXFullSpread + widthWhenSpread / 2 + (index * (widthWhenSpread + maxGap));
                // Interpolate between center (0) and full spread center position based on spacing
                const xCenter = xCenterFullSpread * spacing;
                
                ctx.save();
                
                // Draw rounded rectangle with shadow and clipping
                this.roundRect(ctx, xCenter - imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight, radius);
                
                ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
                ctx.shadowBlur = shadow * 2;
                ctx.shadowOffsetY = shadow;
                ctx.fillStyle = "white";
                
                ctx.fill();
                ctx.clip();
                ctx.drawImage(img, xCenter - imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
                
                ctx.restore();
            });

            ctx.restore();
        }

        this.error = ctx.filter === "none" ? undefined : "safari-canvas-filters";
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
        const composition = await new ComposedImage([file.reference], Object.keys(BackgroundImages)[0]).commit();

        Router.go(`/home/${composition.uuid}`);
    }

    private handleResetClick() {
        if (!this.composition) return;

        this.composition.transforms = { ...TransformDefaults };
        this.updateAndCommit();
    }

    private async handleBackgroundClick({ target }: MouseEvent) {
        const { id } = target as HTMLElement;
        if (id === "new") {
            const { name, mimeType, size, data } = await uploadFile("base64Binary");
            const image = await new FileUpload("background", name, mimeType, size, data).commit();
            if (this.composition) this.composition.background = image.uuid;
        } else if (id && this.composition) {
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
                    this.backgrounds?.find(image => image.uuid === detail)?.delete();
                    if (this.composition?.background === detail) {
                        this.composition.background = Object.keys(BackgroundImages)[0];
                        this.updateAndCommit();
                    }
                }
            }
        });
    }

    private async handleScreenshotClick({ target }: MouseEvent) {
        const { id } = target as HTMLElement;
        if (id === "new-screenshot") {
            const { name, mimeType, size, data } = await uploadFile("base64Binary");
            const image = await new FileUpload("screenshot", name, mimeType, size, data).commit();
            if (this.composition) {
                this.composition.images.push(image.reference);
                this.screenshots.push(image);
                await this.loadForegroundImages();
                this.updateAndCommit();
            }
        }
    }

    private handleDeleteScreenshot({ detail }: CustomEvent<string>) {
        document.createElement("app-dialog").show({
            title: "Please confirm",
            text: "Do you really want to delete this screenshot?",
            actions: {
                Delete: async () => {
                    if (this.composition) {
                        // Find the screenshot to delete
                        const screenshotToDelete = this.screenshots.find(img => img.uuid === detail);
                        
                        // Remove from composition and commit first to remove the reference
                        this.composition.images = this.composition.images.filter(ref => ref.uuid !== detail);
                        await this.composition.commit();
                        
                        // Update local state
                        this.screenshots = this.screenshots.filter(img => img.uuid !== detail);
                        
                        // Now delete the file record
                        if (screenshotToDelete) {
                            await screenshotToDelete.delete();
                        }
                        
                        // Reload and redraw
                        await this.loadForegroundImages();
                        this.drawCanvas();
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

    private async handleExportClick({ detail }: CustomEvent<string>) {
        const dataURL = this.get("canvas").toDataURL("image/jpeg", 0.9);

        switch (detail) {
            case "copy-url":
                const blob = await fetch(dataURL).then(image => image.blob());
                const file = new File([blob], `${crypto.randomUUID()}.jpg`, { type: blob.type });

                const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
                const response = await fetch(`${VITE_SUPABASE_URL}/storage/v1/object/images/${file.name}`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: file,
                });

                if (response.ok) {
                    await navigator.clipboard.writeText(`${location.origin}/images/${file.name}`);
                }

                document.createElement("app-notification").show({
                    title: response.ok ? "Success" : "Error",
                    text: response.ok
                        ? "The image was successfully uploaded and the link copied to your clipboard."
                        : "Unfortunately, an unexpected error occured. If the error persists, please open an issue at GitHub or contact us via the about page.",
                    type: response.ok ? "primary" : "danger"
                });
                break;
            case "copy-image":
                await this.handleCopy();
                document.createElement("app-notification").show({
                    title: "Success",
                    text: "The image was successfully copied to your clipboard."
                });
                break;
            case "download-image":
                downloadObjectURL(dataURL, `cappie-${new Date().getTime()}.jpg`);
                break;
        }
    }

    private handleCopy = async () => {
        const type = "image/png";
        const canvas = this.get("canvas");

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type));
        if (!blob) return;

        const item = new ClipboardItem({ [type]: blob });
        await navigator.clipboard.write([item]);
    }

    private loadBackgroundImage() {
        if (!this.composition) return;

        const src = BackgroundImages[this.composition.background]?.path
            ?? this.backgrounds?.find(image => image.uuid === this.composition?.background)?.dataURL;
        if (!src) return;

        const image = new Image();
        image.src = src;
        image.onload = () => {
            this.backgroundImage = image;
            this.drawCanvas();
        }
    }

    private async loadForegroundImages() {
        if (!this.composition || !this.composition.images || this.composition.images.length === 0) {
            this.foregroundImages = [];
            this.drawCanvas();
            return;
        }

        const loadedImages: HTMLImageElement[] = [];
        let loadedCount = 0;
        
        for (const imageRef of this.composition.images) {
            const file = await imageRef.data;
            const image = new Image();
            image.src = file.dataURL;
            
            image.onload = () => {
                loadedImages.push(image);
                loadedCount++;
                
                if (loadedCount === this.composition!.images.length) {
                    this.foregroundImages = loadedImages;
                    this.drawCanvas();
                }
            };
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

    async updated(properties: Map<string, unknown>) {
        if (properties.has("composition") && this.composition) {
            // Load screenshots for this composition
            await this.loadCompositionScreenshots();
        }
        
        if (
            ["composition", "backgrounds"].some(key => properties.has(key))
            && this.composition && this.backgrounds
        ) {
            this.loadForegroundImages();
            this.loadBackgroundImage();

            if (!this.composition.preview) {
                this.commit();
            }
        }
    }

    private async loadCompositionScreenshots() {
        if (!this.composition || !this.composition.images) {
            this.screenshots = [];
            return;
        }

        const loadedScreenshots: FileUpload[] = [];
        for (const imageRef of this.composition.images) {
            const file = await imageRef.data;
            if (file) {
                loadedScreenshots.push(file);
            }
        }
        this.screenshots = loadedScreenshots;
    }

    firstUpdated() {
        window.addEventListener("resize", this.drawCanvas);
        window.addEventListener("copy", this.handleCopy);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("resize", this.drawCanvas);
        window.removeEventListener("copy", this.handleCopy);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-home": AppHome;
    }
}
