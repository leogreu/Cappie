import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("menu-item")
export class MenuItem extends AppComponent {
    // TODO: Should probably have a default type
    @property({ type: String, reflect: true })
    type: "primary" | "success" | "danger" | undefined;

    @property({ type: String, reflect: true })
    value = "";

    @property({ type: Boolean, reflect: true })
    active = false;

    @property({ type: Boolean, reflect: true })
    checked = false;

    @property({ type: Boolean, reflect: true })
    static = false;

    static styles = css`
        :host {
            display: flex;
            align-items: center;
            padding: var(--size-2-5);
            padding-left: var(--size-4);
            border-radius: var(--radius-md);
            cursor: pointer;
        }

        :host([static]) {
            font-style: italic;
            cursor: not-allowed;
        }

        :host(:is(:not([static]):hover, [active])) {
            background-color: var(--surface-2);
        }

        :host(:is(:not([static])[type="primary"]:hover, [type="primary"][active])) {
            background-color: var(--primary-light);
        }

        :host(:is(:not([static])[type="success"]:hover, [type="success"][active])) {
            background-color: var(--success-light);
        }

        :host(:is(:not([static])[type="danger"]:hover, [type="danger"][active])) {
            background-color: var(--danger-light);
        }

        slot:not([name]) {
            display: flex;
            align-items: center;
            margin-right: auto;
            padding-right: var(--size-6);
            font-size: var(--text-sm);
            color: var(--text-2);
        }

        :host(:is(:not([static]):hover, [active])) slot:not([name]) {
            color: var(--text-1);
        }

        :host(:is(:not([static]):hover, [active])[type="primary"]) slot:not([name]) {
            color: var(--primary);
        }

        :host(:is(:not([static]):hover, [active])[type="success"]) slot:not([name]) {
            color: var(--success);
        }

        :host(:is(:not([static]):hover, [active])[type="danger"]) slot:not([name]) {
            color: var(--danger);
        }

        slot:not([name])::slotted(app-icon) {
            margin-left: calc(-1 * var(--size-1));
            margin-right: var(--size-2-5);
            font-size: var(--text-base);
            color: var(--text-3);
        }

        :host(:is(:not([static]):hover, [active])) slot:not([name])::slotted(app-icon) {
            color: var(--text-2);
        }

        :host(:is(:not([static]):hover, [active])[type="primary"]) slot:not([name])::slotted(app-icon) {
            color: var(--primary);
        }

        :host(:is(:not([static]):hover, [active])[type="success"]) slot:not([name])::slotted(app-icon) {
            color: var(--success);
        }

        :host(:is(:not([static]):hover, [active])[type="danger"]) slot:not([name])::slotted(app-icon) {
            color: var(--danger);
        }

        :host([checked]) slot[name="suffix"] {
            font-size: var(--text-xs);
            color: var(--text-2);
        }

        :host(:is(:not([static]):hover, [active])) slot[name="suffix"] {
            color: var(--text-1);
        }
    `;

    render() {
        return html`
            <slot></slot>
            <slot name="suffix">
                ${this.checked
                    ? html`<app-icon name="check-solid"></app-icon>`
                    : undefined
                }
            </slot>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "menu-item": MenuItem;
    }
}
