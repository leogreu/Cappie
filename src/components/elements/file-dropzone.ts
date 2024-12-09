import { AppComponent, customElement, property, state, html } from "components/base/app-component.ts";
import { uploadFile, readFile, type Base64File, type TextFile } from "utils/files.ts";

@customElement("file-dropzone")
export class FileDropzone extends AppComponent {
    @property({ type: String })
    type: "text" | "base64Binary" = "text";

    @property({ type: Number })
    megabyteLimit?: number;

    @property({ type: Boolean })
    active = true;

    @state()
    drag = false;

    render() {
        return html`
            <app-placeholder
                bordered
                ?clickable=${this.active}
                ?light=${this.drag}
                @click=${this.handleClick}
                @drop=${this.handleDrop}
                @dragover=${this.handleDragover}
                @dragleave=${this.handleDragleave}
            >
                <app-icon slot="icon" name="image-duotone"></app-icon>
                <slot></slot>
            </app-placeholder>
        `;
    }

    private async handleClick() {
        if (!this.active) return;

        const file = await uploadFile(this.type as "text"); // or "base64Binary"
        this.emitInputEvent(file);
    }

    private handleDrop(event: DragEvent) {
        if (!this.active) return;

        event.preventDefault();
        this.drag = false;

        Array.from(event.dataTransfer?.items ?? []).forEach(async item => {
            const input = item.getAsFile();
            if (input) {
                const file = await readFile(input, this.type as "text"); // or "base64Binary"
                this.emitInputEvent(file);
            }
        });
    };

    private emitInputEvent(file: TextFile | Base64File) {
        if (!this.megabyteLimit || file.size <= (this.megabyteLimit * 1024 * 1024)) {
            this.emit<TextFile | Base64File>("file-input", file);
        }
    }

    private handleDragover(event: DragEvent) {
        event.preventDefault();
        this.drag = this.active;
    };

    private handleDragleave() {
        this.drag = false;
    };
}

declare global {
    interface HTMLElementTagNameMap {
        "file-dropzone": FileDropzone;
    }
}
