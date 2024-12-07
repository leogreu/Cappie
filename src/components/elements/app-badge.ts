import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("app-badge")
export class AppBadge extends AppComponent {
    @property({ type: String, reflect: true })
    type: "default" | "primary" | "success" | "danger" | undefined;

    @property({ type: String, reflect: true })
    size: "small" | "normal" | "large" | undefined;

    @property({ type: Boolean, reflect: true })
    light = false;

    @property({ type: Boolean, reflect: true })
    rounded = false;

    @property({ type: Boolean, reflect: true })
    narrow = false;

    @property({ type: Boolean, reflect: true })
    ellipsis = false;

    // TODO: This is probably the better approach of hiding elements (not using reflect and adjusting the render method) – ...
    // ..., therefore evaluate other places where it can be applied
    @property({ type: Boolean })
    closable = false;

    static styles = css`
        :host {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: fit-content;
            gap: var(--size-1);
            padding: .25em .75em;
            white-space: nowrap;
            font-family: inherit;
            font-size: var(--text-sm);
            line-height: var(--leading-none);
            color: var(--text-2);
            background-color: var(--surface-1);
            border: 1px solid var(--contour);
            border-radius: var(--radius-md);
        }

        :host([light]) {
            background-color: var(--surface-2);
        }

        :host([type]:not([type=default])), :host([light]) {
            border-color: transparent;
        }

        :host([type=primary]) {
            color: var(--surface-1);
            background-color: var(--primary);
        }

        :host([type=primary][light]) {
            color: var(--primary);
            background-color: var(--primary-light);
        }

        :host([type=success]) {
            color: var(--surface-1);
            background-color: var(--success);
        }

        :host([type=success][light]) {
            color: var(--success);
            background-color: var(--success-light);
        }

        :host([type=danger]) {
            color: var(--surface-1);
            background-color: var(--danger);
        }

        :host([type=danger][light]) {
            color: var(--danger);
            background-color: var(--danger-light);
        }

        :host([size=small]) {
            font-size: var(--text-xs);
            border-radius: var(--radius-sm);
        }

        :host([size=large]) {
            font-size: var(--text-base);
        }

        :host([rounded]) {
            border-radius: var(--radius-full);
        }

        :host([narrow]) {
            gap: 0;
            padding: .25em .5em;
        }

        :host([ellipsis]) {
            display: block;
            width: unset;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        icon-button {
            margin-right: calc(-1 * var(--size-1));
        }
    `;

    render() {
        return html`
            <slot></slot>
            ${this.closable
                ? html`
                    <icon-button
                        name="xmark-regular"
                        size="small"
                        type=${this.type ?? "default"}
                        @click=${this.handleCloseClick}
                    ></icon-button>
                `
                : undefined
            }
        `;
    }

    handleCloseClick() {
        this.emit("close");
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-badge": AppBadge;
    }
}
