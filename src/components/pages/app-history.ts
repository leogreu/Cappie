import { AppComponent, customElement, css, html } from "../base/app-component.ts";

@customElement("app-history")
export class AppHistory extends AppComponent {
    static styles = css`
        :host {
            padding: var(--size-8);
        }
    `;

    render() {
        return html`
            <app-group direction="grid">
                History
            </app-group>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-history": AppHistory;
    }
}
