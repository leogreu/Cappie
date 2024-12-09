import { AppComponent, customElement, css, html } from "../base/app-component.ts";

@customElement("app-index")
export class AppIndex extends AppComponent {
    static styles = css`
        :host {
            display: flex;
            flex: 1;
            justify-content: center;
            align-items: center;
            padding: var(--size-8);
        }

        app-group:first-child {
            max-width: 40rem;
            text-align: center;
        }

        app-badge {
            box-shadow: var(--shadow-sm) var(--shadow);
        }
    `;

    render() {
        return html`
            <app-group direction="column" gap="huge" centered>
                <app-badge size="large" rounded>
                    <app-title size="micro" bold>
                        🧢 &nbsp;Cappie
                    </app-title>
                </app-badge>
                <app-group direction="column">
                    <app-title size="large">
                        Beautiful Screenshots in Seconds
                    </app-title>
                    <app-paragraph size="large">
                        Cappie allows you to easily create beautiful and colorful screenshots. Without registration, fully offline, and super fast.
                    </app-paragraph>
                </app-group>
                <a href="/home">
                    <app-button type="primary" size="small">
                        Start now
                    </app-button>
                </a>
            </app-group>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-index": AppIndex;
    }
}
