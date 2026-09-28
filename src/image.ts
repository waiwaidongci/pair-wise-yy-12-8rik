import type { Photo } from "./types";

const MAX_EDGE = 900;
const QUALITY = 0.72;

/** 读取图片文件，等比压缩后转成 dataURL 存档，避免 localStorage 超限 */
export function fileToCompressedPhoto(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取照片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("解析照片失败"));
      img.onload = () => {
        const scale = Math.min(
          1,
          MAX_EDGE / Math.max(img.width, img.height),
        );
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ name: file.name, dataUrl: String(reader.result) });
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        } catch {
          dataUrl = String(reader.result);
        }
        resolve({ name: file.name, dataUrl });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
