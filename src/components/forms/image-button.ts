import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("image-button")
export class ImageButton extends AppComponent {
    @property({ type: Boolean })
    checked = false;

    @property({ type: Boolean })
    deletable = false;

    static styles = css`
        :host {
            position: relative;
        }

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

        app-button {
            position: absolute;
            top: 0;
            right: 0;
            transform: translateX(50%) translateY(-50%);
            z-index: 20;
            opacity: 0;
            transition: opacity var(--duration-long) var(--duration-long);
        }

        :host(:hover) app-button {
            opacity: 1;
        }
    `;

    render() {
        return html`
            <button tabindex="0">
                <slot></slot>
            </button>
            ${this.deletable
                ? html`
                    <app-button size="tiny" narrow rounded @click=${this.handleDeleteClick}>
                        <app-icon name="xmark-solid"></app-icon>
                    </app-button>
                `
                : undefined
            }
        `;
    }

    private handleDeleteClick(event: MouseEvent) {
        event.stopPropagation();
        this.emit("delete-image", this.id);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "image-button": ImageButton;
    }
}
