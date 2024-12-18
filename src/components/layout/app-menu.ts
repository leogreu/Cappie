import { AppComponent, customElement, css, html } from "components/base/app-component.ts";
import { MenuItem } from "./menu-item.ts";

@customElement("app-menu")
export class AppMenu extends AppComponent {
    static styles = css`
        :host {
            display: block;
            padding: var(--size-1-5);
        }

        ::slotted(app-divider) {
            margin: var(--size-1-5) calc(-1 * var(--size-1-5));
        }
    `;

    render() {
        return html`
            <slot @click="${this.handleClick}"></slot>
        `;
    }

    handleClick(event: MouseEvent) {
        const target = event.target instanceof HTMLElement ? event.target.closest("menu-item") : null;
        if (target && !target.static) this.emit<string>("item-click", target.value);
    }

    get items(): MenuItem[] {
        return this.querySelector("slot")
            ?.assignedElements().filter(element => element instanceof MenuItem)
            ?? Array.from(this.querySelectorAll("menu-item"));
    }

    get activeItem() {
        return this.items.find(item => item.matches("[active]"));
    }

    navigate(direction: "up" | "down") {
        if (this.activeItem) {
            const nextItem = direction === "down"
                ? this.activeItem.nextElementSibling
                : this.activeItem.previousElementSibling;

            this.activeItem.active = false;
            if (nextItem instanceof MenuItem) nextItem.active = true;
        } else {
            const firstItem = this.items.at(direction === "up" ? -1 : 0);
            if (firstItem) firstItem.active = true;
        }
    }

    select() {
        this.activeItem?.click();
        this.unselect();
    }

    unselect() {
        if (this.activeItem) this.activeItem.active = false;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-menu": AppMenu
    }
}
