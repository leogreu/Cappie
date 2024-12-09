import { AppComponent, customElement, css, html } from "../base/app-component.ts";

@customElement("app-index")
export class AppIndex extends AppComponent {
    static styles = css`
        :host {
            display: flex;
            flex: 1;
            padding: var(--size-8);
        }

        main {
            display: flex;
        }
    `;

    render() {
        return html`
            <main>
                Index
            </main>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-index": AppIndex;
    }
}
