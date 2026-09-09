export type ImageSource = string | File | Blob | HTMLImageElement;

export async function resolveImageElement(
  image: ImageSource,
): Promise<HTMLImageElement> {
  if (image instanceof HTMLImageElement) return waitForImage(image);

  const isBlobSource = image instanceof Blob;
  const src = isBlobSource ? URL.createObjectURL(image) : image;
  const img = new Image();
  if (!isBlobSource) img.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    img.onload = () => {
      if (isBlobSource) URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = () => {
      if (isBlobSource) URL.revokeObjectURL(src);
      reject(new Error(`Failed to load image: ${isBlobSource ? "blob" : src}`));
    };
    img.src = src;
  });
}

function waitForImage(img: HTMLImageElement): Promise<HTMLImageElement> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve(img);
  if (img.complete && img.naturalWidth === 0) {
    return Promise.reject(new Error("Failed to load image"));
  }
  return new Promise((resolve, reject) => {
    img.addEventListener("load", () => resolve(img), { once: true });
    img.addEventListener(
      "error",
      () => reject(new Error("Failed to load image")),
      { once: true },
    );
  });
}
