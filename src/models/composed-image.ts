import { DataBlock, block, field, type BlockReference } from "persistence/data-block.ts";
import { FileUpload } from "./file-upload.ts";

export const TransformOptions: {
    [key: string]: {
        name: string;
        min: number;
        max: number;
        step: number;
        default: number;
        requiresMultiple?: boolean;
    };
} = {
    blur: {
        name: "Blur",
        min: 0,
        max: 20,
        step: 1,
        default: 10
    },
    scale: {
        name: "Scale",
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.75
    },
    radius: {
        name: "Radius",
        min: 0,
        max: 50,
        step: 1,
        default: 15
    },
    shadow: {
        name: "Shadow",
        min: 0,
        max: 25,
        step: 1,
        default: 15
    },
    spacing: {
        name: "Spacing",
        min: 0,
        max: 1,
        step: 0.01,
        default: 1,
        requiresMultiple: true
    },
    rotate: {
        name: "Rotation",
        min: 0,
        max: 15,
        step: 1,
        default: 0,
        requiresMultiple: true
    },
    elevate: {
        name: "Elevation",
        min: -15,
        max: 15,
        step: 1,
        default: 0,
        requiresMultiple: true
    }
};

export const AspectRatios = ["", "1 / 1", "4 / 3", "16 / 9"];

export const BezelOptions = ["", "iphone", "ipad", "macbook"] as const;
export type BezelType = typeof BezelOptions[number];

// Bezel configurations: define where the screenshot should be placed within each bezel
// All values are in percentages relative to the bezel image dimensions
export const BezelConfigs: Record<Exclude<BezelType, "">, {
    label: string;
    path: string;
    // Screen area within the bezel (as percentages)
    screenX: number;      // Left offset percentage
    screenY: number;      // Top offset percentage
    screenWidth: number;  // Width percentage
    screenHeight: number; // Height percentage
    screenRadius: number; // Corner radius percentage (relative to screen width)
}> = {
    iphone: {
        label: "iPhone",
        path: "/bezels/iphone.png",
        // iPhone 1350x2760 - screen area approximately
        screenX: 4.5,
        screenY: 2.2,
        screenWidth: 91,
        screenHeight: 95.6,
        screenRadius: 15
    },
    ipad: {
        label: "iPad",
        path: "/bezels/ipad.png",
        // iPad 2640x1880 - screen area approximately
        screenX: 5.5,
        screenY: 7.5,
        screenWidth: 89,
        screenHeight: 85,
        screenRadius: 2
    },
    macbook: {
        label: "MacBook",
        path: "/bezels/macbook.png",
        // MacBook 3220x2100 - screen area (just the display, not keyboard)
        screenX: 11.5,
        screenY: 5.5,
        screenWidth: 77,
        screenHeight: 63,
        screenRadius: 1.5
    }
};

@block({ collection: "files", store: "composed-image" })
export class ComposedImage extends DataBlock {
    @field({ relation: [FileUpload], lazy: true })
    images: BlockReference<FileUpload>[];

    @field()
    background: string;

    @field({ type: Number })
    ratio = AspectRatios[0];

    @field()
    bezel: BezelType = "";

    @field({ type: Boolean })
    portrait = false;

    @field({ type: Object })
    transforms = ComposedImage.defaults;

    @field()
    preview?: string;

    constructor(images: BlockReference<FileUpload>[], background: string) {
        super();
        this.images = images;
        this.background = background;
    }

    static get defaults() {
        return Object.fromEntries(
            Object.entries(TransformOptions).map(([key, value]) => [key, value.default])
        );
    }
}
