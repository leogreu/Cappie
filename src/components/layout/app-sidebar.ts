import { AppComponent, customElement, css, html } from "components/base/app-component.ts";

@customElement("app-sidebar")
export class AppSidebar extends AppComponent {
    static styles = css`
        :host {
            padding: var(--size-6) var(--size-4);
            background-color: var(--surface-1);
            border-right: 1px solid var(--surface-3);
            box-shadow: var(--shadow-sm) var(--shadow);
        }

        app-group:first-child {
            height: 100%
        }
    `;

    render() {
        return html`
            <app-group direction="column" justify="space-between" centered>
                <app-group direction="column" gap="huge" centered>
                    <a href="/">
                        <img src="/favicon.svg" width="24">
                    </a>
                    <icon-button size="medium" name="house-solid"></icon-button>
                    <icon-button size="medium" name="image-solid"></icon-button>
                </app-group>
                <icon-button size="medium" name="circle-info-solid"></icon-button>
            </app-group>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-sidebar": AppSidebar;
    }
}
