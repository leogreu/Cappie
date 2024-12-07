import { AppComponent, customElement, state, css, html } from "./components/base/app-component.ts";
import type { Base64File } from "utils/files.ts";

// Import all components to be used without import
import.meta.glob("./**/*.ts", { eager: true });

@customElement("app-container")
export class AppContainer extends AppComponent {
    @state()
    file?: Base64File;

    static styles = css`
        :host {
            display: flex;
            flex: 1;
            height: 100%;
        }

        main {
            display: grid;
            place-items: center;
            flex: 2;
            margin: var(--size-12);
            background-color: var(--surface-2);
            border-radius: var(--radius-sm);
        }

        img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            overflow: hidden;

            scale: var(--scale);
            border-radius: calc(var(--radius) * 1px);
        }

        aside {
            display: flex;
            flex: 1;
            justify-content: center;
            align-items: center;
        }
    `;

    render() {
        return html`
            <main>
                ${this.file
                    ? html`
                        <img src="data:${this.file.mimeType};base64,${this.file.data}">
                    `
                    : html`
                        <file-dropzone type="base64Binary" @file-input=${this.handleFileInput}>
                            Upload image
                        </file-dropzone>
                    `
                }
            </main>
            <aside>
                Scale
                <input
                    name="scale"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value=${this.getProperty("scale")}
                    @input=${this.handleNumericInput}
                >
                Radius
                <input
                    name="radius"
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value=${this.getProperty("radius")}
                    @input=${this.handleNumericInput}
                >
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
