import { AppComponent, customElement, state, css, html } from "./components/base/app-component.ts";
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
    rotate_x: {
        name: "Rotate (x-axis)",
        min: 0,
        max: 360,
        step: 1
    },
    rotate_y: {
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
    file?: Base64File;

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
            max-width: 100%;
            max-height: 100%;
            margin: 0;
            border-radius: var(--radius-lg);
            overflow: hidden;
        }

        img {
            grid-row: 1;
            grid-column: 1;
        }

        img.background {
            height: 100%;
            width: 100%;
            object-fit: cover;
            scale: 1.05;

            filter: blur(calc(var(--blur) * 1px));
        }

        img.foreground {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            overflow: hidden;
            box-shadow: 0 calc(var(--shadow) * 1px) calc(var(--shadow) * 2px) calc(var(--shadow) * -1px) black;

            scale: var(--scale);
            border-radius: calc(var(--radius) * 1px);
            transform: perspective(75rem) rotateX(calc(var(--rotate_x) * -1deg)) rotateY(calc(var(--rotate_y) * 1deg));
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
                        <figure style="aspect-ratio: ${this.ratio || 'unset'};">
                            <img class="background" src=${BackgroundImages[this.background].previewPath}>
                            <img class="foreground" src="data:${this.file.mimeType};base64,${this.file.data}">
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
                                value=${Number(this.getProperty(key))}
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
        this.setProperty(name, value);
    }

    getProperty(name: string) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
    }

    setProperty(name: string, value: string) {
        document.documentElement.style.setProperty(`--${name}`, value);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-container": AppContainer;
    }
}
