import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("image-button")
export class ImageButton extends AppComponent {
    @property({ type: Boolean })
    checked = false;

    static styles = css`
        button {
            display: grid;
            place-items: center;
            width: 100%;
            height: 100%;
            padding: 0;
            margin: 0;
            aspect-ratio: 16 / 9;
            font-size: var(--text-xl);
            border: 1px solid var(--contour);
            border-radius: var(--radius-md);
            background-color: var(--surface-1);
            cursor: pointer;
            overflow: hidden;
        }

        :host([checked]) button, button:focus-visible {
            outline: none;
            box-shadow: var(--ring-md) var(--surface-1), var(--ring-lg) var(--primary);
        }

        :host(:not([disabled])) button:hover {
            filter: brightness(var(--hover-brightness));
        }

        slot {
            pointer-events: none;
        }

        slot::slotted(img) {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    `;

    render() {
        return html`
            <button tabindex="0">
                <slot></slot>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "image-button": ImageButton;
    }
}
