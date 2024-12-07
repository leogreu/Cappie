import { customElement, property, css } from "components/base/app-component.ts";
import { AppText } from "components/typography/app-text.ts";

@customElement("app-paragraph")
export class AppParagraph extends AppText {
    @property({ type: String, reflect: true })
    size: "tiny" | "small" | "normal" | "medium" | "large" | undefined;

    @property({ type: Boolean, reflect: true })
    bold = false;

    @property({ type: Boolean, reflect: true })
    light = false;
    
    static styles = css`
        :host {
            display: block;
            font-size: var(--text-base);
            font-weight: var(--text-normal);
            line-height: var(--leading-normal);
            color: var(--text-2);
        }

        :host([size="tiny"]) {
            font-size: var(--text-xs);
            font-weight: var(--text-light);
        }

        :host([size="small"]) {
            font-size: var(--text-sm);
            font-weight: var(--text-normal);
        }

        :host([size="medium"]) {
            font-size: var(--text-lg);
            font-weight: var(--text-normal);
        }

        :host([size="large"]) {
            font-size: var(--text-xl);
            font-weight: var(--text-normal);
        }

        :host([bold]) {
            font-weight: var(--text-medium);
        }

        :host([light]) {
            color: var(--text-3);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "app-paragraph": AppParagraph
    }
}
