export type TextFile = {
    data: string;
    name: string;
    extension: string;
    size: number;
};

export type Base64File = TextFile & {
    mimeType: string;
};

export const downloadData = async (data: string | Blob, name: string, mimeType?: string) => {
    const objectURL = await getObjectURL(data, mimeType);
    downloadObjectURL(objectURL, name);
    URL.revokeObjectURL(objectURL);
}

export const getObjectURL = async (data: string | Blob, mimeType: string = "text/plain") => {
    if (!(data instanceof Blob)) {
        if (data.length % 4 === 0 && RegExp(/^[A-Za-z0-9+/=]+$/).test(data)) {
            const dataURL = `data:${mimeType};base64,${data}`;
            const response = await fetch(dataURL);
            data = await response.blob();
        } else {
            data = new Blob([data], { type: mimeType });
        }
    }

    return URL.createObjectURL(data);
};

export const downloadObjectURL = async (objectURL: string, name: string) => {
    const anchor = document.createElement("a");
    anchor.href = objectURL;
    anchor.download = name;

    anchor.click();
};

// Keep reference for iOS Safari camera upload
let input: HTMLInputElement;

export function uploadFile(method: "text"): Promise<TextFile>;
export function uploadFile(method: "base64Binary"): Promise<Base64File>;
export function uploadFile(method: "text" | "base64Binary"): Promise<TextFile | Base64File> {
    input = document.createElement("input");
    input.type = "file";

    return new Promise((resolve, reject) => {
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (file) {
                resolve(readFile(file, method as "text")); // or "base64Binary"
            } else {
                reject(new Error("No file selected"));
            }
        }, { once: true });
    
        input.click();
    });
};

export function readFile(file: File, method: "text"): Promise<TextFile>;
export function readFile(file: File, method: "base64Binary"): Promise<Base64File>;
export function readFile(file: File, method: "text" | "base64Binary"): Promise<TextFile | Base64File> {
    return new Promise((resolve, reject) => {
        const { name, size } = file;
        const extension = name.split(".").at(-1);
        if (!extension) {
            throw new Error("File without extension uploaded");
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const result = reader.result as string;
            if (method === "text") {
                resolve({ data: result, name, extension, size });
            } else {
                const regexp = new RegExp(/^data:(?<mimeType>.*);base64,(?<data>.*)$/);
                const { data, mimeType } = regexp.exec(result)?.groups ?? {};
                resolve({ data, mimeType, name, extension, size });
            }
        }, { once: true });

        reader.addEventListener("error", () => {
            reject(new Error("Failed to read file"));
        }, { once: true });

        method === "text"
            ? reader.readAsText(file)
            : reader.readAsDataURL(file);
    });
}

export const getDirHandle = async () => {
    if (!("showDirectoryPicker" in window)) {
        throw new Error("file-system-access-not-available-error");
    }

    // @ts-ignore, since not yet widely supported
    return await window.showDirectoryPicker({ mode: "readwrite" });
}

export const saveFileWithHandle = async (dirHandle: any, data: string | Blob, name: string) => {
    const escapedName = name.replace(/[/\\?%*:|"<>]/g, "-");
    const fileHandle = await dirHandle.getFileHandle(escapedName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data instanceof Blob ? data : new Blob([data]));
    return await writable.close();
};
