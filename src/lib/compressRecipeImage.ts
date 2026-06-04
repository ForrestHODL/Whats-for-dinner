const MAX_DIMENSION = 1200;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const TARGET_BYTES = 320_000;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.5;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not compress image")),
      type,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read compressed image"));
    };
    reader.onerror = () => reject(new Error("Could not read compressed image"));
    reader.readAsDataURL(blob);
  });
}

async function pickOutputMime(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await canvasToBlob(canvas, "image/webp", INITIAL_QUALITY);
  if (blob.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

export function isRecipeDataImage(url: string | undefined): boolean {
  return Boolean(url?.startsWith("data:image/"));
}

/** Resize and compress a photo for storage in the recipe library. */
export async function compressRecipeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPEG, PNG, or WebP image");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Image is too large (max 15 MB)");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");

    ctx.drawImage(bitmap, 0, 0, width, height);

    const mime = await pickOutputMime(canvas);
    let quality = INITIAL_QUALITY;
    let blob = await canvasToBlob(canvas, mime, quality);

    while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, mime, quality);
    }

    return blobToDataUrl(blob);
  } finally {
    bitmap.close();
  }
}

export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return 0;
  return Math.ceil((base64.length * 3) / 4);
}
