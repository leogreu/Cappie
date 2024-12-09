import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("check-input")
export class CheckInput extends AppComponent {
    @property({ type: String })
    name = "";

    @property({ type: String })
    value = "";

    @property({ type: Boolean, reflect: true })
    checked = false;

    @property({ type: Boolean, reflect: true })
    disabled = false;

    static styles = [
        css`
            :host {
                display: block;
                width: fit-content;
            }

            label {
                display: flex;
            }

            input {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                flex-shrink: 0;
                width: var(--size-4);
                height: var(--size-4);
                margin: var(--size-1) 0;
                border: 1px solid var(--contour);
                cursor: pointer;
            }

            input:checked {
                background-color: var(--primary);
                border: transparent;
            }

            input:focus-visible {
                outline: none;
                box-shadow: var(--ring-md) var(--surface-1), var(--ring-lg) var(--primary);
            }

            :host([disabled]) input {
                opacity: var(--disabled-opacity);
                cursor: not-allowed;
            }

            app-group {
                margin-left: var(--size-2);
            }
        `,
        css`
            input {
                border-radius: var(--radius-sm);
            }

            input:checked {
                background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'><path d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/></svg>");
            }

            @media (prefers-color-scheme: dark) {
                input:checked {
                    background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'><path d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/></svg>");
                }
            }
        `
    ];

    render() {
        return html`
            <label>
                <input
                    type="checkbox"
                    name=${this.name}
                    value=${this.value}
                    .checked=${this.checked}
                    ?disabled=${this.disabled}
                    @input=${this.handleInput}
                >
                <app-group direction="column" gap="none">
                    <app-paragraph>
                        <slot></slot>
                    </app-paragraph>
                    <app-paragraph size="small" light>
                        <slot name="help"></slot>
                    </app-paragraph>
                </app-group>
            </label>
        `;
    }

    handleInput(event: InputEvent) {
        this.checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "check-input": CheckInput;
    }
}
