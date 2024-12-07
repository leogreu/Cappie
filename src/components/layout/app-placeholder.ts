import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("app-placeholder")
export class AppPlaceholder extends AppComponent {
    @property({ type: Boolean, reflect: true })
    bordered = false;

    @property({ type: Boolean, reflect: true })
    light = false;

    @property({ type: Boolean, reflect: true })
    clickable = false;

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            flex: 1;
            justify-content: center;
            align-items: center;
            padding: var(--size-4) var(--size-8);
            text-align: center;
        }

        :host([bordered]) {
            border: 1px dashed var(--contour);
            border-radius: var(--radius-lg);
        }

        :host([light]), :host([clickable]:hover) {
            background-color: var(--dust);
            border-color: var(--text-3);
        }

        :host([clickable]:hover) {
            cursor: pointer;
        }

        app-icon, slot[name="icon"]::slotted(*) {
            margin-block: var(--size-4);
            font-size: var(--text-4xl);
            color: var(--text-3);
        }

        slot[name="title"]::slotted(*) {
            margin-bottom: var(--size-2);
        }

        slot:not([name])::slotted(*) {
            /* Used with host padding and icon margin-block for symmetric icon-only spacing */
            margin-bottom: var(--size-4);
        }

        app-title, app-paragraph {
            max-width: 25rem;
        }
    `;

    render() {
        return html`
            <slot name="icon">
                <app-icon slot="icon" name="circle-info-thin"></app-icon>
            </slot>
            <app-title size="tiny">
                <slot name="title"></slot>
            </app-title>
            <app-paragraph size="small">
                <slot></slot>
            </app-paragraph>
        `;
    }

    firstUpdated() {
        // TODO: Evaluate whether a wrapping div with @click and event.stopPropagation() is better
        this.addEventListener("click", () => {
            if (this.clickable) this.emit("placeholder-click");
        });
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-placeholder": AppPlaceholder
    }
}
