import { AppComponent, customElement, css, html } from "../base/app-component.ts";

@customElement("app-about")
export class AppAbout extends AppComponent {
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
                About
            </main>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-about": AppAbout;
    }
}
