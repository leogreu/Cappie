import { AppComponent, customElement, css, html } from "../base/app-component.ts";

@customElement("app-about")
export class AppAbout extends AppComponent {
    static styles = css`
        :host {
            display: flex;
            flex: 1;
            justify-content: center;
            align-items: center;
            padding: var(--size-8);
        }

        main {
            max-width: 40rem;
        }

        h1, h2, h3 {
            color: var(--text-1);
        }

        p {
            line-height: var(--leading-normal);
            color: var(--text-2);
        }
    `;

    render() {
        return html`
            <main>
                <h1>About</h1>
                <h3>Responsible person</h3>
                <p>Leonard Greulich</p>
                <h3>Postal address</h3>
                <p>Meppener Str. 11a<br>
                48155 Münster<br>
                Germany</p>
                <h3>Contact</h3>
                <p>Phone: +49 1590 5368729<br>
                E-mail: leonard.greulich@gmail.com</p>
                <h2>Privacy</h2>
                <p>The Cappie app does not collect any user data. Instead, image processing happens fully client-side. However, the hosting provider may temporarily collect the IP address of the user with the date and time of access to ensure the functionality of the website.</p>
            </main>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-about": AppAbout;
    }
}
