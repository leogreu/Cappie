import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("image-button")
export class ImageButton extends AppComponent {
    @property()
    src = String();

    @property({ type: Boolean })
    checked = false;

    static styles = css`
        button {
            display: inline-flex;
            padding: 0;
            margin: 0;
            aspect-ratio: 16 / 9;
            border: 1px solid var(--contour);
            border-radius: var(--radius-md);
            cursor: pointer;
            overflow: hidden;
        }

        :host([checked]) button, button:focus-visible {
            outline: none;
            box-shadow: var(--ring-md) var(--surface-1), var(--ring-lg) var(--primary);
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    `;

    render() {
        return html`
            <button tabindex="0">
                <img src=${this.src}>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "image-button": ImageButton;
    }
}
