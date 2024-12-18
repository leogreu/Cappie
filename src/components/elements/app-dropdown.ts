import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";

export type DropdownItem = {
    name: string;
    icon: string;
};

@customElement("app-dropdown")
export class AppDropdown extends AppComponent {
    @property({ type: Boolean, reflect: true })
    rendered = false;

    @property({ type: Boolean, reflect: true })
    visible = false;

    @property({ type: String, reflect: true })
    vertical: "bottom" | "top" = "bottom";

    @property({ type: String, reflect: true })
    horizontal: "right" | "left" | "both" = "right";

    @property({ type: Boolean, attribute: "stay-open" })
    stayOpen = false;

    @property({ type: Boolean })
    manual = false;

    static styles = css`
        :host {
            position: relative;
            display: inline-block;
            width: fit-content;
        }

        /* Use content slot for positioning and ::slotted(*) for visuals and animation in order
        to use the content slot for size calculations without any transforms being applied. */
        slot[name=content] {
            position: absolute;
            display: none;
            right: 0;
            margin: var(--size-2) 0 0 0;
            white-space: nowrap;
            z-index: 30;
        }

        :host([rendered]) slot[name=content] {
            display: block;
        }

        slot[name=content]::slotted(*) {
            display: block;
            background-color: var(--surface-1);
            border: 1px solid var(--contour);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md) var(--shadow);
            overflow: auto;
            opacity: 0;
            transform: scale(.9);
            transform-origin: top right;
            transition: opacity var(--duration-short), transform var(--duration-medium) var(--cubic-snap);
        }

        :host([visible]) slot[name=content]::slotted(*) {
            opacity: 1;
            transform: none;
        }

        :host([horizontal=left]) slot[name=content] {
            right: unset;
            left: 0;
        }

        :host([horizontal=left]) slot[name=content]::slotted(*) {
            transform-origin: top left;
        }

        :host([horizontal=both]) slot[name=content] {
            left: 0;
            white-space: unset;
        }

        :host([horizontal=both]) slot[name=content]::slotted(*) {
            transform-origin: top center;
        }

        :host([vertical=top]) slot[name=content] {
            bottom: 100%;
            margin: 0 0 var(--size-2) 0;
        }

        :host([vertical=top]) slot[name=content]::slotted(*) {
            transform-origin: bottom right;
        }

        :host([vertical=top][horizontal=left]) slot[name=content]::slotted(*) {
            transform-origin: bottom left;
        }

        :host([vertical=top][horizontal=both]) slot[name=content]::slotted(*) {
            transform-origin: bottom center;
        }

        :host([fullwidth]) {
            width: 100%;
        }
    `;

    render() {
        return html`
            <slot name="trigger" @click=${this.handleTriggerClick}></slot>
            <slot name="content"></slot>
        `;
    }

    firstUpdated() {
        // If there is no trigger defined, render the dropdown content automatically
        if (!this.get("slot").assignedElements().at(0)) {
            requestAnimationFrame(() => this.show());
        }
    }

    handleTriggerClick() {
        if (!this.manual) {
            this.rendered ? this.hide() : this.show();
        }
    }

    show() {
        // If there is no content or it's already rendered, then do nothing
        const content = this.querySelector<HTMLElement>("[slot='content']");
        if (!content || this.rendered) return;

        // Use an IntersectionObserver once to try to bring the content into the viewport
        const threshold = 0.01;
        let previousAlignment: AppDropdown["vertical"] | undefined;
        const observer = new IntersectionObserver(([{ intersectionRatio }]) => {
            if ((intersectionRatio + threshold) < 1 && !previousAlignment) {
                previousAlignment = this.vertical;
                this.vertical = this.vertical === "bottom" ? "top" : "bottom";
            } else {
                if ((intersectionRatio + threshold) < 1 && previousAlignment) {
                    // If there was an unsuccessful alignment change, reset and set max height
                    content.style.maxHeight = "50vh";
                    this.vertical = previousAlignment;
                }

                this.visible = true;
                observer.disconnect();
            }
        }, {
            // 1% steps to frequently trigger callback (TODO: Evaluate performance impact)
            threshold: Array.from({ length: 1 / threshold }).map((_, i) => i * threshold)
        });

        // First start the observation and then render content
        observer.observe(this.get("slot[name=content]"));
        this.rendered = true;

        // Handle click outside the dropdown and keyboard up/down/escape
        document.addEventListener("click", this.handleDocumentClick);
        document.addEventListener("keydown", this.handleDocumentKeydown);
    }

    hide() {
        this.visible = false;

        // Use setTimeout() instead of transitionend event because of issues with Safari
        setTimeout(() => {
            this.rendered = false;
            this.emit("content-hide");
        }, Number(
            getComputedStyle(document.body).getPropertyValue("--duration-medium").replace("ms", "")
        ));

        // Remove handler for click outside the dropdown and keyboard up/down/escape
        document.removeEventListener("click", this.handleDocumentClick);
        document.removeEventListener("keydown", this.handleDocumentKeydown);
    }

    // Arrow functions used in order to not need .bind(this)
    handleDocumentClick = (event: MouseEvent) => {
        const pathHasTrigger = event.composedPath().includes(this.get("slot[name='trigger']"));
        const pathHasContent = event.composedPath().includes(this.get("slot[name='content']"));

        if (!pathHasTrigger && !(this.stayOpen && pathHasContent)) {
            this.hide();
        }
    }

    handleDocumentKeydown = (event: KeyboardEvent) => {
        // Currently, only the AppMenu supports up/down keyboard navigation
        const appMenu = this.querySelector("app-menu");
        if (!appMenu) return;

        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            appMenu.navigate(event.key === "ArrowUp" ? "up" : "down");
        } else if (event.key === "Enter") {
            appMenu.select();
        } else if (event.key === "Escape") {
            appMenu.unselect();
            this.hide();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("click", this.handleDocumentClick);
        document.removeEventListener("keydown", this.handleDocumentKeydown);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-dropdown": AppDropdown;
    }
}
