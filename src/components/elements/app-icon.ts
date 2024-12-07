import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";
import { IconStore } from "stores/icon-store.ts";

@customElement("app-icon")
export class AppIcon extends AppComponent {
    @property({ type: String })
    name = "";

    static styles = css`
        :host {
            display: inline-flex;
            width: 1em;
            height: 1em;
        }

        svg {
            width: inherit;
            height: inherit;
        }
    `;

    render() {
        return html`
            <svg></svg>
        `;
    }

    // TODO: Evaluate whether there is a more elegant way (e.g., within the render function)
    updated() {
        IconStore.getIcon(this.name).then(icon => this.get("svg").innerHTML = icon);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-icon": AppIcon;
    }
}
