import { AppComponent, customElement, css, html } from "components/base/app-component.ts";
import { all } from "persistence/controller/lit-controller.ts";
import { FileUpload } from "../../models/file-upload.ts";

@customElement("app-history")
export class AppHistory extends AppComponent {
    @all(FileUpload.where({ type: "screenshot" }))
    images: FileUpload[] = [];

    static styles = css`
        :host {
            display: flex;
            flex: 1;
            padding: var(--size-8);
            overflow: auto;
        }

        :host > app-group {
            flex: 1;
        }

        [direction=grid] {
            --min-width: 20rem;
        }

        image-button {
            max-width: 25rem;
        }
    `;

    render() {
        return html`
            <app-group direction="column" gap="large">
                <app-title>
                    History
                </app-title>
                ${this.images.length
                    ? html`
                        <app-group direction="grid">
                            ${this.images.map(image => html`
                                <image-button
                                    id=${image.uuid}
                                    deletable
                                    @delete-image=${this.handleDeleteImage}
                                >
                                    <img src=${image.dataURL}>
                                </image-button>
                            `)}
                        </app-group>
                    `
                    : html`
                        <app-paragraph>No images uploaded yet.</app-paragraph>
                    `
                }
            </app-group>
        `;
    }

    private handleDeleteImage({ detail }: CustomEvent<string>) {
        document.createElement("app-dialog").show({
            title: "Please confirm",
            text: "Do you really want to delete the image?",
            actions: {
                Delete: () => {
                    this.images.find(image => image.uuid === detail)?.delete();
                }
            }
        });
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "app-history": AppHistory;
    }
}
