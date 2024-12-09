import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";
import type { NotificationDefinition } from "./app-notification.ts";

type DialogDefinition = Omit<NotificationDefinition, "duration"> & {
    options?: {
        [key: string]: string;
    },
    actions?: {
        [key: string]: (options: Record<string, boolean>) => Promise<void> | void;
    };
    closeActions?: string[];
};

@customElement("app-dialog")
export class AppDialog extends AppComponent {
    @property({ type: Boolean })
    closable = false;

    @property({ type: Boolean, reflect: true })
    rendered = false;

    @property({ type: Boolean, reflect: true })
    visible = false;

    // Store whether the dialog was initialized with a DialogDefinition
    singleton = false;

    static styles = css`
        :host {
            position: fixed;
            display: none;
            inset: 0;
            align-items: center;
            justify-content: center;
            z-index: 30;
        }

        :host([rendered]) {
            display: flex;
        }

        app-backdrop {
            transition: opacity var(--duration-medium);
            opacity: 0;
        }

        :host([visible]) app-backdrop {
            opacity: 1;
        }

        article {
            box-sizing: border-box;
            position: relative;
            display: flex;
            flex-direction: column;
            width: var(--width, 30rem);
            max-width: calc(100% - 1rem);
            max-height: calc(100% - 1rem);
            padding: var(--size-6);
            background-color: var(--surface-1);
            border: 1px solid var(--surface-3);
            border-radius: var(--radius-xl);
            overflow: hidden visible;
            z-index: 30;
            opacity: 0;
            transform: scale(0.9);
            transition: opacity var(--duration-medium), transform var(--duration-medium);
        }

        :host([visible]) article {
            opacity: 1;
            transform: none;
        }

        icon-button {
            position: absolute;
            top: var(--size-4);
            right: var(--size-4);
            z-index: 30;
        }

        slot[name="header"]::slotted(*) {
            margin-bottom: var(--size-2);
        }

        slot[name="footer"]::slotted(*) {
            margin-top: var(--size-4);
        }
    `;

    render() {
        return html`
            <app-backdrop @click=${this.handleCloseClick}></app-backdrop>
            <article
                part="panel"
                @keydown=${this.handleKeyDown}
                @transitionend=${this.handleTransitionEnd}
            >
                <focus-trap>
                    ${this.closable
                        ? html`
                            <icon-button
                                size="large"
                                name="xmark-regular"
                                @click=${this.handleCloseClick}
                            ></icon-button>
                        `
                        : undefined
                    }
                    <slot name="header"></slot>
                    <slot></slot>
                    <slot name="footer"></slot>
                </focus-trap>
            </article>
        `;
    }

    private handleCloseClick() {
        if (this.closable) {
            this.emit("close").then(() => this.hide());
        }
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") this.handleCloseClick();
    }

    private handleTransitionEnd(event: TransitionEvent) {
        if (!this.visible && event.propertyName === "opacity") {
            this.singleton ? this.remove() : this.rendered = false;
            this.emit("hide");
        }
    }

    async show(definition?: DialogDefinition) {
        if (definition) {
            // Add title to dialog
            const title = document.createElement("app-title");
            title.slot = "header";
            title.size = "small";
            title.textContent = definition.title;
            this.append(title);

            // Add text to dialog
            const paragraph = document.createElement("app-paragraph");
            paragraph.textContent = definition.text;
            this.append(paragraph);

            // Add options to dialog
            if (definition.options) {
                const options = Object.entries(definition.options).map(([key, value]) => {
                    return Object.assign(document.createElement("check-input"), {
                        id: key,
                        textContent: value
                    });
                });

                const group = Object.assign(document.createElement("app-group"), {
                    slot: "footer",
                    direction: "column",
                    gap: "small"
                });
                group.append(...options);
                this.append(group);
            }

            // Add actions to dialog
            if (definition.actions) {
                const actions = Object.entries(definition.actions).map(([key, value]) => {
                    // Render close actions with default type
                    return this.getAction(key, value,
                        definition.closeActions?.includes(key) ? undefined : definition.type
                    );
                });

                const group = document.createElement("app-group");
                group.slot = "footer";
                group.append(...actions);

                // Only add default close button when no close actions where specified
                if (!definition.closeActions?.length) {
                    group.append(this.getAction("Close", undefined, undefined, true));
                }

                this.append(group);
            } else {
                const button = this.getAction("Okay", undefined, definition.type, true);
                button.slot = "footer";
                this.append(button);
            }

            // Enfore explicit close when close actions where defined
            if (!definition.closeActions?.length) {
                this.closable = true;
            }
        }

        if (!this.isConnected) {
            this.singleton = true;
            document.body.append(this);
        }

        // TODO: Evaluate whether to use @lit-labs/motion instead of rendered-visible-approach
        this.rendered = true;
        await new Promise(resolve => setTimeout(() => resolve(this.visible = true), 50));
    }

    // TODO: Best approach (as shadowRoot.querySelector does not work in show function)?
    updated(properties: Map<string, unknown>) {
        if (properties.has("visible")) this.get("focus-trap").active = this.visible;
    }

    getAction(l10n: string, callback?: NonNullable<DialogDefinition["actions"]>[string], type?: DialogDefinition["type"], light?: boolean) {
        const button = Object.assign(document.createElement("app-button"), {
            type,
            light: light ?? false,
            textContent: l10n
        });

        button.addEventListener("click", async () => {
            const options = Object.fromEntries(
                Array.from(this.querySelectorAll("check-input"))
                    .map(input => [input.id, input.checked])
            );

            if (callback) {
                button.loading = true;
                await callback(options);
            }
            this.hide();
        });

        return button;
    }

    hide() {
        // Timeout currently required for Safari to fire transitionend, see:
        // https://github.com/alpinejs/alpine/discussions/2810#discussioncomment-2538461
        setTimeout(() => this.visible = false, 50);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-dialog": AppDialog;
    }
}
