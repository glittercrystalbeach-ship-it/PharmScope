import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  onCapture: (imageDataUrl: string) => void;
  onBack: () => void;
}

export default function CameraScreen({ onCapture, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch {
      setError('カメラへのアクセスが許可されていません。\nブラウザの設定をご確認ください。');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || capturing) return;
    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setTimeout(() => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(dataUrl);
    }, 150);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />

      {/* Close button */}
      <div className="relative z-10 flex justify-end p-5 pt-12">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Guide overlay */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        {/* Instruction text */}
        <p className="text-white text-sm font-medium text-center mb-5 px-4 py-2 bg-black/40 rounded-full backdrop-blur-sm">
          処方箋を枠内に合わせてください
        </p>

        {/* Guide rectangle */}
        <div className="relative w-full max-w-sm" style={{ aspectRatio: '3/4' }}>
          {/* Yellow border */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{ border: '2px solid #FFD700', boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)' }}
          />

          {/* Corner markers */}
          {[
            'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 ${cls}`}
              style={{ borderColor: '#FFD700' }}
            />
          ))}

          {/* Center crosshair hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-6 relative opacity-50">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-400 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-yellow-400 -translate-x-1/2" />
            </div>
          </div>
        </div>

        {/* Zoom hint */}
        <div className="mt-4 flex items-center gap-3 text-white/60 text-xs">
          <ZoomOut className="w-3.5 h-3.5" />
          <span>ピンチ操作でズーム調整</span>
          <ZoomIn className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center pb-14 pt-4">
        {error ? (
          <div className="text-center px-6">
            <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
            <button
              onClick={startCamera}
              className="mt-3 text-white text-sm underline"
            >
              再試行
            </button>
          </div>
        ) : (
          <button
            onClick={handleCapture}
            disabled={!ready || capturing}
            className={`
              w-20 h-20 rounded-full bg-[#2196f3] flex items-center justify-center
              shadow-2xl shadow-blue-500/50 transition-all duration-150
              ${capturing ? 'scale-90 opacity-70' : 'active:scale-90'}
              ${!ready ? 'opacity-40' : ''}
            `}
          >
            {/* Shutter ring */}
            <div className="w-16 h-16 rounded-full border-4 border-white/70 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
