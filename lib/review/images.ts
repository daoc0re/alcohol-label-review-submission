export const LIMITS = {
  bytes: 10 * 1024 * 1024,
  pixels: 20_000_000,
  edge: 8000,
  ocrEdge: 2200,
  panels: 4,
  jobs: 10,
  batchBytes: 50 * 1024 * 1024,
};
export interface PreparedImage {
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  qualityNotes: string[];
}
export interface ImageHeader {
  mime: string;
  width: number;
  height: number;
}
/** Inspect dimensions before decoding to bound memory allocated to untrusted artwork. */
export function inspectHeader(bytes: Uint8Array): ImageHeader {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, count: number) =>
    String.fromCharCode(...bytes.slice(start, start + count));
  if (bytes.length < 30)
    throw new Error("The image is empty, truncated, or not a supported image.");
  if (bytes[0] === 137 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR")
    return {
      mime: "image/png",
      width: v.getUint32(16),
      height: v.getUint32(20),
    };
  if (bytes[0] === 255 && bytes[1] === 216) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 255)
        throw new Error(
          "The JPEG structure is invalid. Export the artwork again.",
        );
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 2 > bytes.length) break;
      const n = v.getUint16(i);
      if (n < 2 || i + n > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker))
        return {
          mime: "image/jpeg",
          height: v.getUint16(i + 3),
          width: v.getUint16(i + 5),
        };
      i += n;
    }
    throw new Error(
      "JPEG dimensions could not be read. Use a standard or progressive JPEG.",
    );
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const kind = ascii(12, 4);
    if (kind === "VP8X") {
      if (bytes[20] & 2)
        throw new Error(
          "Animated WebP is not supported. Export a single still image.",
        );
      return {
        mime: "image/webp",
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    }
    if (
      kind === "VP8 " &&
      bytes[23] === 0x9d &&
      bytes[24] === 1 &&
      bytes[25] === 0x2a
    )
      return {
        mime: "image/webp",
        width: v.getUint16(26, true) & 0x3fff,
        height: v.getUint16(28, true) & 0x3fff,
      };
    if (kind === "VP8L" && bytes[20] === 0x2f)
      return {
        mime: "image/webp",
        width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
        height:
          1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10),
      };
  }
  throw new Error(
    "Unsupported file. Choose PNG, JPEG, or a still WebP. PDF, SVG, HEIC, and renamed documents are not accepted.",
  );
}
export function validateHeader(h: ImageHeader) {
  if (h.width < 100 || h.height < 100)
    throw new Error(
      "Image is too small. Use artwork at least 100 × 100 pixels.",
    );
  if (
    h.width > LIMITS.edge ||
    h.height > LIMITS.edge ||
    h.width * h.height > LIMITS.pixels
  )
    throw new Error(
      "Image dimensions are too large. Use at most 20 megapixels and 8,000 pixels per side.",
    );
}
export async function prepareImage(
  file: File,
  rotation = 0,
): Promise<PreparedImage> {
  if (!file.size || file.size > LIMITS.bytes)
    throw new Error("Choose a nonempty image no larger than 10 MB.");
  const header = inspectHeader(new Uint8Array(await file.arrayBuffer()));
  validateHeader(header);
  if (
    file.type &&
    file.type !== header.mime &&
    !(file.type === "image/jpg" && header.mime === "image/jpeg")
  )
    throw new Error(
      "The file’s type does not agree with its contents. Export the image again.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "The image could not be decoded. It may be damaged; export a new PNG or JPEG.",
    );
  }
  try {
    validateHeader({
      mime: header.mime,
      width: bitmap.width,
      height: bitmap.height,
    });
    const swap = rotation % 180 !== 0,
      sourceW = swap ? bitmap.height : bitmap.width,
      sourceH = swap ? bitmap.width : bitmap.height;
    const scale = Math.min(1, LIMITS.ocrEdge / Math.max(sourceW, sourceH)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceW * scale);
    canvas.height = Math.round(sourceH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Image processing is unavailable in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      bitmap,
      (-bitmap.width * scale) / 2,
      (-bitmap.height * scale) / 2,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Image preparation failed.")),
        "image/png",
      ),
    );
    const qualityNotes: string[] = [];
    if (Math.min(sourceW, sourceH) < 600)
      qualityNotes.push(
        "Low resolution: small warning text may be unreadable. A sharper image is recommended.",
      );
    if (scale < 1)
      qualityNotes.push(
        `Resized from ${sourceW} × ${sourceH} to ${canvas.width} × ${canvas.height} for bounded processing.`,
      );
    const result = {
      name: file.name,
      blob,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
      qualityNotes,
    };
    canvas.width = canvas.height = 1;
    return result;
  } finally {
    bitmap.close();
  }
}
export function releaseImages(images: PreparedImage[]) {
  for (const image of images) URL.revokeObjectURL(image.url);
}
export function cloneImages(images: PreparedImage[]) {
  return images.map((i) => ({ ...i, url: URL.createObjectURL(i.blob) }));
}
