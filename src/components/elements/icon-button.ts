import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("icon-button")
export class IconButton extends AppComponent {
    @property({ type: String })
    name = "";

    @property({ type: String, reflect: true })
    type: "default" | "primary" | "success" | "warning" | "danger" | undefined;

    @property({ type: String, reflect: true })
    size: "small" | "normal" | "medium" | "large" | undefined;

    @property({ type: Boolean, reflect: true })
    light = false;

    @property({ type: Boolean, reflect: true })
    disabled = false;

    static styles = css`
        button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .5em;
            margin: 0;
            padding: 0;
            font-family: inherit;
            font-size: var(--text-base);
            color: var(--text-3);
            background-color: transparent;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
        }

        button:focus-visible {
            outline: none;
            box-shadow: var(--ring-md) var(--surface-1), var(--ring-lg) var(--primary);
        }

        :host([type=primary]) button {
            color: var(--primary);
        }

        :host([type=success]) button {
            color: var(--success);
        }

        :host([type=warning]) button {
            color: var(--warning);
        }

        :host([type=danger]) button {
            color: var(--danger);
        }
        
        :host([size=small]) button {
            font-size: var(--text-sm);
        }

        :host([size=medium]) button {
            font-size: var(--text-lg);
        }

        :host([size=large]) button {
            font-size: var(--text-xl);
        }

        :host([light]) button {
            color: var(--contour);
        }

        :host([light]) button:hover {
            color: var(--text-3);
        }

        :host([disabled]) button {
            opacity: var(--disabled-opacity);
            cursor: not-allowed;
        }

        :host(:not([disabled])) button:hover {
            color: var(--text-2);
        }
    `;

    render() {
        return html`
            <button ?disabled="${this.disabled}">
                <app-icon name="${this.name}"></app-icon>
                <slot></slot>    
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "icon-button": IconButton;
    }
}
