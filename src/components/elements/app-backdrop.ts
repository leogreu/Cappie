import { AppComponent, customElement, css } from "components/base/app-component.ts";

@customElement("app-backdrop")
export class AppBackdrop extends AppComponent {
    static styles = css`
        :host {
            position: fixed;
            display: block;
            inset: 0;
            background-color: rgba(0, 0, 0, .25);
            z-index: 30;
        }

        /* Do not use backdrop blur on desktop for performance reasons */
        @media only screen and (max-width: ${AppComponent.breakpoints.notebook}px) {
            :host {
                -webkit-backdrop-filter: blur(5px);
                backdrop-filter: blur(5px);
            }
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "app-backdrop": AppBackdrop
    }
}
