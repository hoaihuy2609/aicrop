
import { BoundingBox, ExtractionResult } from "../types";
import JSZip from "jszip";

export const cropImage = (
  originalImage: HTMLImageElement,
  box: BoundingBox,
  label: string
): Promise<ExtractionResult> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Thêm padding (khoảng 1.5% kích thước) để tránh cắt sát chữ
    const padding = 15; 
    const ymin = Math.max(0, box.ymin - padding);
    const xmin = Math.max(0, box.xmin - padding);
    const ymax = Math.min(1000, box.ymax + padding);
    const xmax = Math.min(1000, box.xmax + padding);

    // Chuyển đổi từ hệ tọa độ 0-1000 của Gemini sang pixel thực tế
    const x = (xmin / 1000) * originalImage.width;
    const y = (ymin / 1000) * originalImage.height;
    const width = ((xmax - xmin) / 1000) * originalImage.width;
    const height = ((ymax - ymin) / 1000) * originalImage.height;

    canvas.width = width;
    canvas.height = height;

    if (ctx) {
      // Đặt nền trắng cho canvas trước khi vẽ để tránh các phần thừa bị đen hoặc trong suốt
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(
        originalImage,
        x, y, width, height, // Nguồn
        0, 0, width, height  // Đích
      );
    }

    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          id: Math.random().toString(36).substring(7),
          label,
          dataUrl: canvas.toDataURL("image/jpeg", 0.9),
          blob
        });
      }
    }, "image/jpeg", 0.9);
  });
};

export const createZipArchive = async (results: ExtractionResult[]): Promise<Blob> => {
  const zip = new JSZip();
  results.forEach((res, index) => {
    // Tạo tên file an toàn
    const cleanLabel = res.label.replace(/[^a-z0-9\u00C0-\u1EF9]/gi, '_').toLowerCase();
    const filename = `${cleanLabel || 'crop'}_${index + 1}.jpg`;
    zip.file(filename, res.blob);
  });
  return await zip.generateAsync({ type: "blob" });
};
