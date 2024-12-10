import { DataBlock, block, field, type BlockReference } from "persistence/data-block.ts";
import { FileUpload } from "./file-upload.ts";

export const TransformOptions: {
    [key: string]: {
        name: string;
        min: number;
        max: number;
        step: number;
    };
} = {
    blur: {
        name: "Blur",
        min: 0,
        max: 20,
        step: 1
    },
    scale: {
        name: "Scale",
        min: 0,
        max: 1,
        step: 0.01
    },
    radius: {
        name: "Radius",
        min: 0,
        max: 50,
        step: 1
    },
    shadow: {
        name: "Shadow",
        min: 0,
        max: 25,
        step: 1
    }
};

export const TransformDefaults: {
    [key in keyof typeof TransformOptions]: number;
} = {
    blur: 10,
    scale: 0.75,
    radius: 15,
    shadow: 15
};

export const AspectRatios = ["", "1 / 1", "4 / 3", "16 / 9"];

@block({ collection: "files", store: "composed-image" })
export class ComposedImage extends DataBlock {
    @field({ relation: FileUpload, lazy: true })
    image: BlockReference<FileUpload>;

    @field()
    background: string;

    @field({ type: Number })
    ratio = AspectRatios[0];

    @field({ type: Boolean })
    portrait = false;

    @field({ type: Object })
    transforms: Record<string, number> = { ...TransformDefaults };

    @field()
    preview?: string;

    constructor(image: BlockReference<FileUpload>, background: string) {
        super();
        this.image = image;
        this.background = background;
    }
}
