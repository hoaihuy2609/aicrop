
export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedItem {
  label: string;
  box_2d: BoundingBox;
}

export interface ExtractionResult {
  id: string;
  label: string;
  dataUrl: string;
  blob: Blob;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
