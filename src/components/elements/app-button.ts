import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("app-button")
export class AppButton extends AppComponent {
    @property({ type: String, reflect: true })
    type: "default" | "primary" | "success" | "danger" | undefined;

    @property({ type: String, reflect: true })
    size: "tiny" | "small" | "normal" | "medium" | "large" | undefined;

    @property({ type: Boolean, reflect: true })
    light = false;

    @property({ type: Boolean, reflect: true })
    outline = false;

    @property({ type: Boolean, reflect: true })
    rounded = false;

    @property({ type: Boolean, reflect: true })
    fullwidth = false;

    @property({ type: Boolean, reflect: true })
    narrow = false;

    @property({ type: Boolean, reflect: true })
    shadow = false;

    @property({ type: Boolean, reflect: true })
    loading = false;

    @property({ type: Boolean, reflect: true })
    disabled = false;

    static styles = css`
        :host {
            display: inline-flex;
            width: fit-content;
            -webkit-user-select: none;
            user-select: none;
        }

        button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: .5em 1em;
            font-family: inherit;
            font-size: var(--text-base);
            font-weight: var(--text-medium);
            line-height: var(--leading-normal);
            color: var(--text-1);
            background-color: var(--surface-1);
            border: 1px solid var(--contour);
            border-radius: var(--radius-md);
            cursor: pointer;
        }

        button:focus-visible {
            outline: none;
            box-shadow: var(--ring-md) var(--surface-1), var(--ring-lg) var(--primary);
        }

        :host([light]) button {
            background-color: var(--surface-2);
        }

        :host([light]:not([outline])) button {
            border-color: transparent;
        }

        :host([type=primary]) button {
            color: var(--surface-1);
            background-color: var(--primary);
            border-color: var(--primary);
        }

        :host([type=primary][light]) button {
            color: var(--primary);
            background-color: var(--primary-light);
        }

        :host([type=success]) button {
            color: var(--surface-1);
            background-color: var(--success);
            border-color: var(--success);
        }

        :host([type=success][light]) button {
            color: var(--success);
            background-color: var(--success-light);
        }

        :host([type=danger]) button {
            color: var(--surface-1);
            background-color: var(--danger);
            border-color: var(--danger);
        }

        :host([type=danger][light]) button {
            color: var(--danger);
            background-color: var(--danger-light);
        }

        :host([size=tiny]) button {
            font-size: var(--text-xs);
            border-radius: var(--radius-sm);
        }
        
        :host([size=small]) button {
            font-size: var(--text-sm);
        }

        :host([size=medium]) button {
            font-size: var(--text-lg);
        }

        :host([size=large]) button {
            font-size: var(--text-xl);
            border-radius: var(--radius-lg);
        }

        :host([rounded]) button {
            border-radius: var(--radius-full);
        }

        :host([fullwidth]), :host([fullwidth]) button {
            width: 100%;
        }

        :host([narrow]) button {
            padding: .25em .75em;
            line-height: var(--leading-none);
        }

        :host([shadow]) button {
            box-shadow: var(--shadow-sm) var(--shadow);
        }

        :host([type=primary][shadow]) button {
            box-shadow: var(--shadow-md) var(--primary-light);
        }

        :host([type=success][shadow]) button {
            box-shadow: var(--shadow-md) var(--success-light);
        }

        :host([type=danger][shadow]) button {
            box-shadow: var(--shadow-md) var(--danger-light);
        }

        :host([loading]) button slot {
            visibility: hidden;
        }

        :host([disabled]) button {
            opacity: var(--disabled-opacity);
            cursor: not-allowed;
        }

        :host(:not([disabled])) button:hover {
            filter: brightness(var(--hover-brightness));
        }

        :host(:not([disabled])) button:active {
            filter: brightness(var(--active-brightness));
        }

        app-loader {
            position: absolute;
        }

        app-loader, slot, ::slotted(*) {
            pointer-events: none;
        }

        ::slotted(app-icon) {
            margin: .25em -.25em;
        }

        ::slotted(app-icon:first-child:not(:last-child)) {
            margin-right: .5em;
        }

        ::slotted(app-icon:last-child:not(:first-child)) {
            margin-left: .5em;
        }
    `;

    render() {
        return html`
            <button tabindex="0" ?disabled=${this.loading || this.disabled} @click=${this.handleClick}>
                ${this.loading
                    ? html`<app-loader></app-loader>`
                    : undefined
                }
                <slot></slot>
            </button>
        `;
    }

    handleClick(event: MouseEvent) {
        if (this.loading || this.disabled) event.stopPropagation();
    }

    focus() {
        this.get("button").focus();
    }

    click() {
        this.get("button").click();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-button": AppButton
    }
}
