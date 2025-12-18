
import { MarkerType, DetectedMarker, DetectionResult, Point } from '../types';

declare const cv: any;

export class CvProcessor {
  private tempMat: any;
  private grayMat: any;
  private blurredMat: any;
  private thresholdMat: any;
  private hierarchy: any;
  private contours: any;

  constructor() {
    this.initMats();
  }

  private initMats() {
    if (typeof cv === 'undefined' || !cv.Mat) return;
    this.tempMat = new cv.Mat();
    this.grayMat = new cv.Mat();
    this.blurredMat = new cv.Mat();
    this.thresholdMat = new cv.Mat();
    this.hierarchy = new cv.Mat();
    this.contours = new cv.MatVector();
  }

  public processFrame(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): DetectionResult {
    if (typeof cv === 'undefined' || !cv.Mat) {
      return { markers: [], isAligned: false, statusMessage: 'OpenCV not ready' };
    }

    if (!this.tempMat) this.initMats();

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { markers: [], isAligned: false, statusMessage: 'Canvas context error' };

    // Capture frame from video
    const src = cv.imread(videoElement);
    
    // Convert to grayscale
    cv.cvtColor(src, this.grayMat, cv.COLOR_RGBA2GRAY);
    
    // Blur to reduce noise
    cv.GaussianBlur(this.grayMat, this.blurredMat, new cv.Size(5, 5), 0);
    
    // Adaptive Thresholding for robust detection in different lighting
    cv.adaptiveThreshold(this.blurredMat, this.thresholdMat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // Find contours with hierarchy
    cv.findContours(this.thresholdMat, this.contours, this.hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    const markers: DetectedMarker[] = [];
    const width = src.cols;
    const height = src.rows;

    for (let i = 0; i < this.contours.size(); ++i) {
      const contour = this.contours.get(i);
      const row = this.hierarchy.intPtr(0, i);
      const parentIdx = row[3];
      
      // We look for "Nested" contours: The dot inside the shape
      // According to the requirement: Four corners have different shapes with a solid dot inside.
      // So the dot is a child contour (parentIdx != -1).
      if (parentIdx !== -1) {
        const parentContour = this.contours.get(parentIdx);
        const parentArea = cv.contourArea(parentContour);
        const childArea = cv.contourArea(contour);

        // Filter by relative area (dot should be smaller than parent)
        if (parentArea > 400 && parentArea < 20000 && childArea > 50 && childArea < parentArea * 0.4) {
          const rect = cv.boundingRect(parentContour);
          const center: Point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          
          // Determine parent shape
          const perimeter = cv.arcLength(parentContour, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(parentContour, approx, 0.04 * perimeter, true);
          
          let type = MarkerType.UNKNOWN;
          if (approx.rows === 4) {
            type = MarkerType.SQUARE;
          } else if (approx.rows > 6) {
            type = MarkerType.CIRCLE;
          }
          approx.delete();

          // Avoid duplicate markers for the same parent
          const exists = markers.some(m => Math.hypot(m.center.x - center.x, m.center.y - center.y) < 30);
          if (!exists && type !== MarkerType.UNKNOWN) {
            markers.push({ type, center, area: parentArea, confidence: 1.0 });
          }
        }
      }
    }

    // Logic for alignment check
    // Requirement: TL: Circle, TR: Square, BL: Square, BR: Circle
    // We sort markers by their position
    let isAligned = false;
    let statusMessage = "请对准试剂棒...";

    if (markers.length >= 4) {
      // Basic sorting logic (naive approach for demonstration)
      const sortedByY = [...markers].sort((a, b) => a.center.y - b.center.y);
      const topRow = sortedByY.slice(0, 2).sort((a, b) => a.center.x - b.center.x);
      const bottomRow = sortedByY.slice(2, 4).sort((a, b) => a.center.x - b.center.x);

      if (topRow.length === 2 && bottomRow.length === 2) {
        const tl = topRow[0];
        const tr = topRow[1];
        const bl = bottomRow[0];
        const br = bottomRow[1];

        const matchesPattern = 
          tl.type === MarkerType.CIRCLE && 
          tr.type === MarkerType.SQUARE && 
          bl.type === MarkerType.SQUARE && 
          br.type === MarkerType.CIRCLE;

        if (matchesPattern) {
          // Check aspect ratio (Target is 7x15cm, roughly 1:2.14)
          const stripWidth = (tr.center.x - tl.center.x + br.center.x - bl.center.x) / 2;
          const stripHeight = (bl.center.y - tl.center.y + br.center.y - tr.center.y) / 2;
          const aspectRatio = stripHeight / stripWidth;

          if (aspectRatio > 1.5 && aspectRatio < 3.0) {
            isAligned = true;
            statusMessage = "对准成功！保持稳定";
          } else {
            statusMessage = "请调整距离和角度";
          }
        }
      }
    } else if (markers.length > 0) {
      statusMessage = `已识别 ${markers.length}/4 个特征点`;
    }

    // Draw visual feedback on the source mat before deleting
    this.drawFeedback(src, markers, isAligned);
    cv.imshow(canvasElement, src);

    src.delete();
    return { markers, isAligned, statusMessage };
  }

  private drawFeedback(mat: any, markers: DetectedMarker[], isAligned: boolean) {
    const colorSuccess = new cv.Scalar(34, 197, 94, 255); // Tailwind green-500
    const colorSearching = new cv.Scalar(239, 68, 68, 255); // Tailwind red-500
    const colorMarker = isAligned ? colorSuccess : new cv.Scalar(59, 130, 246, 255); // Blue-500

    markers.forEach(m => {
      const point = new cv.Point(m.center.x, m.center.y);
      cv.circle(mat, point, 10, colorMarker, -1);
      cv.putText(mat, m.type === MarkerType.CIRCLE ? "C" : "S", new cv.Point(m.center.x + 15, m.center.y), cv.FONT_HERSHEY_SIMPLEX, 0.6, colorMarker, 2);
    });

    if (isAligned) {
      // Draw a box around the detected area
      const sortedByY = [...markers].sort((a, b) => a.center.y - b.center.y);
      const topRow = sortedByY.slice(0, 2).sort((a, b) => a.center.x - b.center.x);
      const bottomRow = sortedByY.slice(2, 4).sort((a, b) => a.center.x - b.center.x);
      
      const pts = new cv.MatVector();
      const points = new cv.Mat(4, 1, cv.CV_32SC2);
      points.data32S.set([
        topRow[0].center.x, topRow[0].center.y,
        topRow[1].center.x, topRow[1].center.y,
        bottomRow[1].center.x, bottomRow[1].center.y,
        bottomRow[0].center.x, bottomRow[0].center.y
      ]);
      pts.push_back(points);
      cv.polylines(mat, pts, true, colorSuccess, 3);
      pts.delete();
      points.delete();
    }
  }

  public dispose() {
    if (this.tempMat) this.tempMat.delete();
    if (this.grayMat) this.grayMat.delete();
    if (this.blurredMat) this.blurredMat.delete();
    if (this.thresholdMat) this.thresholdMat.delete();
    if (this.hierarchy) this.hierarchy.delete();
    if (this.contours) this.contours.delete();
  }
}
