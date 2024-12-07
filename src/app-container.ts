import { AppComponent, customElement, state, css, html } from "./components/base/app-component.ts";
import type { Base64File } from "utils/files.ts";

// Import all components to be used without import
import.meta.glob("./**/*.ts", { eager: true });

const Options: {
    [name: string]: {
        min: number;
        max: number;
        step: number;
    };
} = {
    blur: {
        min: 0,
        max: 10,
        step: 0.5
    },
    scale: {
        min: 0,
        max: 1,
        step: 0.01
    },
    radius: {
        min: 0,
        max: 50,
        step: 1
    },
    shadow: {
        min: 0,
        max: 25,
        step: 1
    }
};

@customElement("app-container")
export class AppContainer extends AppComponent {
    @state()
    file?: Base64File;

    static styles = css`
        :host {
            box-sizing: border-box;
            display: flex;
            flex: 1;
            height: 100%;
            padding: var(--size-8);
            gap: var(--size-8);
        }

        main {
            position: relative;
            display: grid;
            place-items: center;
            flex: 2;
            border-radius: var(--radius-lg);
            overflow: hidden;
        }

        div {
            position: absolute;
            height: 100%;
            width: 100%;
            background-image: url("background-1.jpg");
            background-size: cover;
            scale: 1.05;

            filter: blur(calc(var(--blur) * 1px));
        }

        img {
            position: absolute;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            overflow: hidden;
            box-shadow: 0 calc(var(--shadow) * 1px) calc(var(--shadow) * 2px) calc(var(--shadow) * -1px) black;

            scale: var(--scale);
            border-radius: calc(var(--radius) * 1px);
        }

        file-dropzone {
            position: absolute;
        }

        aside {
            flex: 1;
        }

        app-card {
            height: 100%;
        }
    `;

    render() {
        return html`
            <main>
                <div></div>
                ${this.file
                    ? html`
                        <img src="data:${this.file.mimeType};base64,${this.file.data}">
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
                    <app-group direction="column" gap="huge">
                        ${Object.entries(Options).map(([key, value]) => html`
                            <app-slider
                                name=${key}
                                type="range"
                                min=${value.min}
                                max=${value.max}
                                step=${value.step}
                                value=${Number(this.getProperty(key))}
                                @input=${this.handleNumericInput}
                            >
                                ${key[0].toUpperCase() + key.slice(1)}
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
        "app-container": AppContainer
    }
}
