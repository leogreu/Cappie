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
            padding: var(--size-12);
            background-color: var(--surface-2);
            border-radius: var(--radius-lg);
        }

        canvas {
            width: 100%;
            height: 100%;
            background-color: var(--surface-2);
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
                <input type="range" />
            </aside>
        `;
    }

    private handleFileInput({ detail }: CustomEvent<Base64File>) {
        this.file = detail;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-container": AppContainer
    }
}
