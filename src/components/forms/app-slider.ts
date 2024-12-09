import { AppComponent, customElement, property, css, html } from "components/base/app-component.ts";
import { live } from "lit/directives/live.js";

@customElement("app-slider")
export class AppSlider extends AppComponent {
    @property()
    name = String();

    @property({ type: Number })
    value = 0;

    @property({ type: Number })
    min = 0;

    @property({ type: Number })
    max = 100;

    @property({ type: Number })
    step = 1;

    static styles = css`
        :host {
            position: relative;
        }

        input {
            -webkit-appearance: none;
            flex: 1;
            background-color: transparent;
            cursor: pointer;
        }

        input::-webkit-slider-runnable-track {
            height: var(--size-2);
            background-color: var(--surface-2);
            border-radius: var(--radius-full);
        }

        input::-moz-range-track {
            height: var(--size-2);
            background-color: var(--surface-2);
            border-radius: var(--radius-full);
        }

        input::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: var(--size-6);
            height: var(--size-6);
            margin-top: calc(-1 * var(--size-2));
            background-color: var(--primary);
            border-radius: var(--radius-full);
        }

        input::-moz-range-thumb {
            width: var(--size-6);
            height: var(--size-6);
            background-color: var(--primary);
            border: none;
            border-radius: var(--radius-full);
        }

        app-badge {
            position: absolute;
            transform: translateX(-50%) translateY(250%);
        }

        :host(:not(:hover)) app-badge {
            display: none;
        }
    `;

    render() {
        return html`
            <app-group direction="column">
                <app-paragraph bold>
                    <slot></slot>
                </app-paragraph>
                <input
                    type="range"
                    min=${this.min}
                    max=${this.max}
                    step=${this.step}
                    .value=${live(String(this.value))}
                    @input=${this.handleInput}
                >
                <app-group justify="space-between">
                    <app-paragraph size="small" light>${this.min}</app-paragraph>
                    <app-paragraph size="small" light>${this.max}</app-paragraph>
                </app-group>
                <app-badge
                    narrow
                    style="left: ${((this.value ?? 0 - this.min) * 100) / (this.max - this.min)}%;"
                >
                    ${this.value}
                </app-badge>
            </app-group>
        `;
    }

    private handleInput(event: InputEvent) {
        const { value } = event.target as HTMLInputElement;
        this.value = Number(value);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-slider": AppSlider;
    }
}
