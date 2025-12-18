
import React from 'react';
import { MarkerType, DetectedMarker } from '../types';

interface Props {
  status: string;
  isAligned: boolean;
  markers: DetectedMarker[];
}

const ScannerOverlay: React.FC<Props> = ({ status, isAligned, markers }) => {
  const foundCircleCount = markers.filter(m => m.type === MarkerType.CIRCLE).length;
  const foundSquareCount = markers.filter(m => m.type === MarkerType.SQUARE).length;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Section: Title & Status */}
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 mt-safe">
        <h1 className="text-white text-lg font-bold mb-1 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isAligned ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
          试剂棒扫描仪
        </h1>
        <p className={`text-sm ${isAligned ? 'text-green-400 font-medium' : 'text-gray-300'}`}>
          {status}
        </p>
      </div>

      {/* Center Section: Alignment Guide */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className={`w-48 h-80 border-2 rounded-xl transition-all duration-300 relative flex items-center justify-center
          ${isAligned ? 'border-green-500 bg-green-500/10' : 'border-white/30 border-dashed'}`}>
          
          {/* Corner Guides */}
          <div className="absolute top-[-10px] left-[-10px] w-8 h-8 border-t-4 border-l-4 rounded-tl-lg border-blue-400 opacity-50" />
          <div className="absolute top-[-10px] right-[-10px] w-8 h-8 border-t-4 border-r-4 rounded-tr-lg border-blue-400 opacity-50" />
          <div className="absolute bottom-[-10px] left-[-10px] w-8 h-8 border-b-4 border-l-4 rounded-bl-lg border-blue-400 opacity-50" />
          <div className="absolute bottom-[-10px] right-[-10px] w-8 h-8 border-b-4 border-r-4 rounded-br-lg border-blue-400 opacity-50" />

          {!isAligned && (
            <div className="text-white/40 text-xs text-center px-4 uppercase tracking-widest font-bold">
              将试剂棒置于框内
              <div className="mt-2 text-[10px] font-normal opacity-60">
                左上:圆 | 右上:方<br/>左下:方 | 右下:圆
              </div>
            </div>
          )}

          {/* Scanning Line Animation */}
          {!isAligned && (
             <div className="absolute w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_infinite_linear]" />
          )}
        </div>
      </div>

      {/* Bottom Section: Marker Stats */}
      <div className="flex justify-center gap-4 mb-safe">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3 border border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full border-2 ${foundCircleCount >= 2 ? 'bg-green-500 border-green-400' : 'bg-gray-600 border-gray-400'}`} />
            <span className="text-white text-xs font-mono">C: {foundCircleCount}/2</span>
          </div>
          <div className="w-px h-3 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 border-2 ${foundSquareCount >= 2 ? 'bg-green-500 border-green-400' : 'bg-gray-600 border-gray-400'}`} />
            <span className="text-white text-xs font-mono">S: {foundSquareCount}/2</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ScannerOverlay;
