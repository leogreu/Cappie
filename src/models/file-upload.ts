import { DataBlock, block, field } from "persistence/data-block.ts";

@block({ collection: "files", store: "file-upload" })
export class FileUpload extends DataBlock {
    @field({ index: true })
    type: "background" | "screenshot";

    @field()
    fileName: string;

    @field()
    mimeType: string;

    @field({ type: Number })
    fileSize: number;

    @field()
    base64Binary: string;

    constructor(type: FileUpload["type"], fileName: string, mimeType: string, fileSize: number, base64Binary: string) {
        super();
        this.type = type;
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.base64Binary = base64Binary;
    }

    get megabytes() {
        return (this.fileSize / (1024 * 1024)).toFixed(2);
    }

    get dataURL() {
        return `data:${this.mimeType};base64,${this.base64Binary}`;
    }
}
