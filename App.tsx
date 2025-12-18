
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CvProcessor } from './services/cvProcessor';
import ScannerOverlay from './components/ScannerOverlay';
import { DetectionResult, ScannerState } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cvProcessorRef = useRef<CvProcessor | null>(null);
  const requestRef = useRef<number>();

  const [state, setState] = useState<ScannerState>({
    isCvLoaded: false,
    isCameraActive: false,
    isScanning: false,
    alignmentProgress: 0,
  });

  const [detectionResult, setDetectionResult] = useState<DetectionResult>({
    markers: [],
    isAligned: false,
    statusMessage: '正在启动系统...',
  });

  // Wait for OpenCV.js to load
  useEffect(() => {
    const checkCV = setInterval(() => {
      // @ts-ignore
      if (window.cv && window.cv.Mat) {
        clearInterval(checkCV);
        cvProcessorRef.current = new CvProcessor();
        setState(prev => ({ ...prev, isCvLoaded: true }));
        setDetectionResult(prev => ({ ...prev, statusMessage: 'OpenCV 已就绪' }));
      }
    }, 500);
    return () => clearInterval(checkCV);
  }, []);

  // Initialize Camera
  useEffect(() => {
    if (!state.isCvLoaded) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setState(prev => ({ ...prev, isCameraActive: true, isScanning: true }));
        }
      } catch (err) {
        console.error("Camera error:", err);
        setDetectionResult(prev => ({ ...prev, statusMessage: '无法访问摄像头' }));
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [state.isCvLoaded]);

  // Main Detection Loop
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cvProcessorRef.current || !state.isScanning) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const result = cvProcessorRef.current.processFrame(videoRef.current, canvasRef.current);
      setDetectionResult(result);
    }

    requestRef.current = requestAnimationFrame(processFrame);
  }, [state.isScanning]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [processFrame]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Hidden source video */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />

      {/* Render Canvas (Full Screen) */}
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
        />
        
        {/* Visual Overlays */}
        <ScannerOverlay 
          status={detectionResult.statusMessage}
          isAligned={detectionResult.isAligned}
          markers={detectionResult.markers}
        />
      </div>

      {/* Capture Feedback Toast */}
      {detectionResult.isAligned && (
        <div className="absolute bottom-24 bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-2xl animate-bounce">
          ✓ 已对准，请保持不动
        </div>
      )}

      {/* Loader for OpenCV */}
      {!state.isCvLoaded && (
        <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-white text-xl font-bold mb-2">正在加载视觉模型</h2>
          <p className="text-gray-400 text-sm">初次加载可能需要几秒钟时间，请稍候...</p>
        </div>
      )}
    </div>
  );
};

export default App;
