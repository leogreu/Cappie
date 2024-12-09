import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";
import { routes } from "utils/router.ts";

@customElement("app-sidebar")
export class AppSidebar extends AppComponent {
    @property()
    route = String();

    static styles = css`
        :host {
            padding: var(--size-6) var(--size-4);
            background-color: var(--surface-1);
            border-right: 1px solid var(--surface-3);
            box-shadow: var(--shadow-sm) var(--shadow);
        }

        app-group {
            height: 100%
        }

        a:nth-child(4) {
            margin-top: auto;
        }
    `;

    render() {
        return html`
            <app-group direction="column" gap="huge" centered>
                ${routes.map(route => {
                    const active = route.path === this.route;
                    return html`
                        <a href=${route.path}>
                            ${route.icon
                                ? html`
                                    <icon-button
                                        size="medium"
                                        name="${route.icon}-${active ? 'solid' : 'regular'}"
                                        type=${active ? "primary" : "default"}
                                    ></icon-button>
                                `
                                : html`
                                    <img src="/favicon.svg" width="24">
                                `
                            }
                            
                        </a>
                    `;
                })}
            </app-group>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-sidebar": AppSidebar;
    }
}
