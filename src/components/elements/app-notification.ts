import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

export type NotificationDefinition = {
    title: string;
    text: string;
    type?: "primary" | "success" | "danger";
    duration?: number;
    values?: Record<string, string>;
    translateValues?: boolean;
};

@customElement("app-notification")
export class AppNotification extends AppComponent {
    @property({ type: String, reflect: true })
    type: NotificationDefinition["type"] | undefined;

    @property({ type: Boolean, reflect: true })
    toast = false;

    @property({ type: Boolean, reflect: true })
    rendered = false;

    @property({ type: Boolean, reflect: true })
    visible = false;

    static styles = css`
        :host {
            display: block;
        }

        :host([toast]) {
            position: fixed;
            display: none;
            top: 0;
            right: 0;
            z-index: 30;
        }

        :host([toast][rendered]) {
            display: block;
        }

        .notification-menu {
            padding: var(--size-4);
            background-color: var(--surface-1);
            border: 1px solid var(--contour);
            border-radius: var(--radius-lg);
        }

        :host([toast]) .notification-menu {
            max-width: 25rem;
            margin: var(--size-4);
            box-shadow: var(--shadow-md) var(--shadow);
            opacity: 0;
            transform: translateY(calc(-1 * var(--size-4)));
            transition: opacity var(--duration-medium), transform var(--duration-medium);
        }

        :host([toast][visible]) .notification-menu {
            opacity: 1;
            transform: none;
        }

        app-icon {
            font-size: var(--text-lg);
            color: var(--primary);
        }

        :host([type="success"]) app-icon {
            color: var(--success);
        }

        :host([type="danger"]) app-icon {
            color: var(--danger);
        }
    `;

    render() {
        return html`
            <app-group class="notification-menu" gap="medium" @transitionend="${this.handleTransitionEnd}">
                <app-icon name="${this.icon}"></app-icon>
                <app-group direction="column">
                    <app-title size="micro">
                        <slot name="title"></slot>
                    </app-title>
                    <app-paragraph size="small">
                        <slot name="text"></slot>
                    </app-paragraph>
                </app-group>
                ${this.toast
                    ? html`<icon-button name="xmark-regular" @click="${this.hide}"></icon-button>`
                    : undefined
                }
            </app-group>
        `;
    }

    get icon() {
        const icons = {
            primary: "circle-info-solid",
            success: "circle-check-solid",
            danger: "circle-exclamation-solid"
        };

        return this.type ? icons[this.type] : "circle-info-solid";
    }

    show(definition: NotificationDefinition) {
        for (const [key, value] of Object.entries(definition ?? {})) {
            switch (key) {
                case "title":
                case "text": {
                    const text = document.createElement("app-text");
                    text.slot = key;
                    text.textContent = value as string;
                    this.append(text);
                    break;
                }
                case "type":
                    this.type = value as NotificationDefinition["type"];
            }
        }

        if (!this.isConnected) {
            this.toast = true;
            document.body.append(this);
        }

        this.rendered = true;
        setTimeout(() => this.visible = true, 50);
        setTimeout(() => this.hide(), definition.duration ?? 5000);
    }

    hide() {
        this.visible = false;
    }

    handleTransitionEnd() {
        if (!this.visible) this.remove();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-notification": AppNotification
    }
}
