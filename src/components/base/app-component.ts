import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

class AppComponent extends LitElement {
    // Enable registration of component with Component.register()
    static register(tagName: string) {
        customElements.define(tagName, this);
    }

    // Define breakpoints that are also used within CSS media queries (custom properties do not work there and environment variables are not yet available)
    static breakpoints = {
        phone: 640,
        tablet: 1280,
        notebook: 1920
    };

    get currentBreakpoint() {
        return (Object.keys(AppComponent.breakpoints) as (keyof typeof AppComponent.breakpoints)[])
            .find(key => window.innerWidth <= AppComponent.breakpoints[key]) ?? "wide";
    }

    // Simplify the emission of cancelable, custom events
    emit<T>(name: string, detail?: T, options?: object) {
        const event = new CustomEvent<T>(name, { detail, bubbles: true, cancelable: true, ...options });
        return new Promise<void>(resolve => this.dispatchEvent(event) && resolve());
    }

    // Simplify selection of render root components, overload to allow selection without type assertion
    find<T extends keyof HTMLElementTagNameMap>(query: T): HTMLElementTagNameMap[T] | null;
    find<T extends HTMLElement>(query: string): T | null;
    find<T extends Element>(query: string): T | null {
        return this.renderRoot.querySelector<T>(query);
    }

    get<T extends keyof HTMLElementTagNameMap>(query: T): HTMLElementTagNameMap[T];
    get<T extends HTMLElement>(query: string): T;
    get<T extends Element>(query: string): T {
        const result = this.renderRoot.querySelector<T>(query);
        if (!result) throw new Error(`Element ${query} not in component. Use find instead.`);
        
        return result;
    }

    getAll<T extends keyof HTMLElementTagNameMap>(query: T): Array<HTMLElementTagNameMap[T]>;
    getAll<T extends HTMLElement>(query: string): Array<T>;
    getAll<T extends Element>(query: string): Array<T> {
        return Array.from(this.renderRoot.querySelectorAll(query));
    }
}

export { AppComponent, customElement, property, state, css, html };
