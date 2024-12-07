import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("app-group")
export class AppGroup extends AppComponent {
    @property({ type: String, reflect: true })
    direction: "row" | "column" | "grid" | undefined;

    @property({ type: String, reflect: true })
    gap: "none" | "small" | "normal" | "medium" | "large" | "huge" | undefined;

    @property({ type: String, reflect: true })
    justify:  "start" | "end" | "center" | "space-between" | undefined;

    @property({ type: Boolean, reflect: true })
    centered = false;

    static styles = css`
        :host {
            display: flex;
            gap: var(--size-2);
        }

        :host([direction="column"]) {
            flex-direction: column;
        }

        :host([justify="start"]) {
            justify-content: start;
        }

        :host([justify="end"]) {
            justify-content: end;
        }

        :host([justify="center"]) {
            justify-content: center;
        }

        :host([justify="space-between"]) {
            justify-content: space-between;
        }

        :host([centered]) {
            align-items: center;
        }

        :host([gap="none"]) {
            gap: 0;
        }

        :host([gap="small"]) {
            gap: var(--size-1);
        }

        :host([gap="medium"]) {
            gap: var(--size-3);
        }

        :host([gap="large"]) {
            gap: var(--size-4);
        }

        :host([gap="huge"]) {
            gap: var(--size-6);
        }

        :host([direction="grid"]) {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(var(--min-width, 20rem), 1fr));
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
        "app-group": AppGroup;
    }
}
