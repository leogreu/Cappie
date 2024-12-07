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
    }
};

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
            position: relative;
            display: grid;
            place-items: center;
            flex: 2;
            margin: var(--size-12);
            border-radius: var(--radius-md);
            overflow: hidden;
        }

        div {
            position: absolute;
            height: 100%;
            width: 100%;
            background-image: url("public/background-1.jpg");
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
            box-shadow: var(--shadow-lg) var(--shadow);

            scale: var(--scale);
            border-radius: calc(var(--radius) * 1px);
        }

        file-dropzone {
            position: absolute;
        }

        aside {
            display: flex;
            flex-direction: column;
            flex: 1;
            justify-content: center;
            align-items: center;
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
                            Upload image
                        </file-dropzone>
                    `
                }
            </main>
            <aside>
                ${Object.entries(Options).map(([key, value]) => html`
                    ${key}
                    <input
                        name=${key}
                        type="range"
                        min=${value.min}
                        max=${value.max}
                        step=${value.step}
                        value=${this.getProperty(key)}
                        @input=${this.handleNumericInput}
                    >
                `)}
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
