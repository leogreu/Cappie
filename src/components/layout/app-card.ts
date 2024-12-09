import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

// TODO: Evaluate whether to use for report-chart as well
@customElement("app-card")
export class AppCard extends AppComponent {
    @property({ type: Boolean, reflect: true })
    clickable = false;

    @property({ type: Boolean, reflect: true })
    paddingless = false;

    @property({ type: Boolean, reflect: true })
    overflow = false;

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            background-color: var(--surface-1);
            border: 1px solid var(--surface-3);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm) var(--shadow);
        }

        :host([clickable]:hover) {
            background-color: var(--dust);
            border-color: var(--contour);
            cursor: pointer;
        }

        header {
            padding: var(--size-4);
            border-bottom: 1px solid var(--surface-3);
        }

        article {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        footer {
            padding: var(--size-4);
            border-top: 1px solid var(--surface-3);
        }

        :host(:not([paddingless])) article {
            padding: var(--size-4);
        }

        :host(:not([overflow])) article {
            overflow: auto;
        }
    `;

    render() {
        return html`
            <header>
                <app-group justify="space-between" centered>
                    <app-title size="micro">
                        <slot name="title"></slot>
                    </app-title>
                    <slot name="action"></slot>
                </app-group>
            </header>
            <article>
                <slot></slot>
            </article>
            <footer>
                <slot name="footer"></slot>
            </footer>
        `;
    }

    firstUpdated() {
        // TODO: Evaluate whether a wrapping div with @click is better (same in app-placeholder)
        this.addEventListener("click", event => {
            if (this.clickable) {
                const action = event.composedPath().find(entry => {
                    return entry instanceof HTMLElement && entry.slot === "action";
                });

                if (!action) this.emit("card-click", this.id);
            }
        });
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-card": AppCard;
    }
}
