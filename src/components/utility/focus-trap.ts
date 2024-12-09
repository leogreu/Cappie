import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

@customElement("focus-trap")
export class FocusTrap extends AppComponent {
    @property({ type: Boolean, reflect: true })
    active = false;

    // Remember the original focus before it is trapped
    previousFocus: HTMLElement | undefined;

    static styles = css`
        :host {
            /* TODO: Evaluate accessibility and browser support for display: contents */
            /* Display contents used to allow overflow scroll for user-management modal */
            display: contents;
        }

        button {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
    `;

    render() {
        return html`
            ${this.active
                ? html`
                    <button @focus="${this.trapFocus}"></button>
                    <button id="initial-focus"></button>
                `
                : undefined
            }
            <slot></slot>
            ${this.active
                ? html`<button @focus="${this.trapFocus}"></button>`
                : undefined
            }
        `;
    }

    get focusableElements() {
        const focusableElements = ["text-input", "app-button"];
        return this.get("slot").assignedElements({ flatten: true })
            .flatMap(element => {
                return focusableElements.includes(element.tagName)
                    ? element as HTMLElement
                    : Array.from(element.querySelectorAll<HTMLElement>(focusableElements.join(", ")));
            });
    }

    trapFocus(event: FocusEvent) {
        if ((event.target as HTMLElement).previousElementSibling) {
            this.get("#initial-focus").focus();
        } else {
            this.focusableElements.pop()?.focus();
        }
    }

    updated() {
        this.active ? this.initializeFocus() : this.restoreFocus();
    }

    initializeFocus() {
        this.previousFocus = this.getActiveElement();
        this.get("#initial-focus").focus();
    }

    restoreFocus() {
        this.previousFocus?.focus();
    }

    getActiveElement(root: ShadowRoot | Document = document): HTMLElement {
        const activeElement = root.activeElement as HTMLElement;
        return activeElement?.shadowRoot ? this.getActiveElement(activeElement.shadowRoot) : activeElement;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.restoreFocus();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "focus-trap": FocusTrap;
    }
}
