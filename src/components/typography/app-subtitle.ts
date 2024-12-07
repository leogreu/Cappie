import { customElement, property, css } from "components/base/app-component.ts";
import { AppText } from "components/typography/app-text.ts";

@customElement("app-subtitle")
export class AppSubtitle extends AppText {
    @property({ type: String, reflect: true })
    size: "micro" | "tiny" | "small" | "normal" | "medium" | "large" | undefined;

    static styles = css`
        :host {
            display: block;
            font-size: var(--text-lg);
            font-weight: var(--text-normal);
            line-height: var(--leading-normal);
            color: var(--text-2);
        }

        :host([size="micro"]) {
            font-size: var(--text-xs);
            font-weight: var(--text-normal);
        }

        :host([size="tiny"]) {
            font-size: var(--text-sm);
            font-weight: var(--text-normal);
        }

        :host([size="small"]) {
            font-size: var(--text-base);
            font-weight: var(--text-normal);
        }

        :host([size="medium"]) {
            font-size: var(--text-xl);
            font-weight: var(--text-medium);
        }

        :host([size="large"]) {
            font-size: var(--text-2xl);
            font-weight: var(--text-medium);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "app-subtitle": AppSubtitle
    }
}
