import { customElement, property, css } from "components/base/app-component.ts";
import { AppText } from "components/typography/app-text.ts";

@customElement("app-title")
export class AppTitle extends AppText {
    @property({ type: String, reflect: true })
    size: "micro" | "tiny" | "small" | "normal" | "medium" | "large" | undefined;

    static styles = css`
        :host {
            display: block;
            font-size: var(--text-2xl);
            font-weight: var(--text-semibold);
            line-height: var(--leading-tight);
            color: var(--text-1);
        }

        :host([size="micro"]) {
            font-size: var(--text-base);
            font-weight: var(--text-medium);
        }

        :host([size="tiny"]) {
            font-size: var(--text-lg);
            font-weight: var(--text-medium);
        }

        :host([size="small"]) {
            font-size: var(--text-xl);
            font-weight: var(--text-semibold);
        }

        :host([size="medium"]) {
            font-size: var(--text-3xl);
            font-weight: var(--text-bold);
        }

        :host([size="large"]) {
            font-size: var(--text-4xl);
            font-weight: var(--text-bold);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "app-title": AppTitle
    }
}
