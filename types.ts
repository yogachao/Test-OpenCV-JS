
export interface Point {
  x: number;
  y: number;
}

export enum MarkerType {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  UNKNOWN = 'UNKNOWN'
}

export interface DetectedMarker {
  type: MarkerType;
  center: Point;
  area: number;
  confidence: number;
}

export interface DetectionResult {
  markers: DetectedMarker[];
  isAligned: boolean;
  statusMessage: string;
}

export interface ScannerState {
  isCvLoaded: boolean;
  isCameraActive: boolean;
  isScanning: boolean;
  alignmentProgress: number; // 0 to 100
}
