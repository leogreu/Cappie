import { AppComponent, customElement, css, html } from "components/base/app-component.ts";

const Routes = {
    "/home": "house",
    "/about": "circle-info"
};

@customElement("app-sidebar")
export class AppSidebar extends AppComponent {
    static styles = css`
        :host {
            padding: var(--size-6) var(--size-4);
            background-color: var(--surface-1);
            border-right: 1px solid var(--surface-3);
            box-shadow: var(--shadow-sm) var(--shadow);
        }

        app-group {
            height: 100%
        }

        a:nth-child(3) {
            margin-top: auto;
        }
    `;

    render() {
        return html`
            <app-group direction="column" gap="huge" centered>
                <a href="/">
                    <img src="/favicon.svg" width="24">
                </a>
                ${Object.entries(Routes).map(([key, value]) => html`
                    <a href=${key}>
                        <icon-button size="medium" name="${value}-solid"></icon-button>
                    </a>
                `)}
            </app-group>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-sidebar": AppSidebar;
    }
}
