import { AppComponent, customElement, css, html } from "components/base/app-component.ts";

@customElement("app-text")
export class AppText extends AppComponent {
    static styles = css`
        :host {
            display: block;
            font-size: 1em;
        }
    `;

    render() {
        return html`
            <slot></slot>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-text": AppText
    }
}
