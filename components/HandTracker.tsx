import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GameStatus } from '../types';

interface HandTrackerProps {
  onHandMove: (x: number, y: number) => void;
  setGameStatus: (status: GameStatus) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandMove, setGameStatus }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastVideoTime, setLastVideoTime] = useState(-1);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  // 1. Initialize MediaPipe
  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        setGameStatus(GameStatus.LOADING_MODEL);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setGameStatus(GameStatus.IDLE);
      } catch (error) {
        console.error("Error loading hand landmarker:", error);
      }
    };

    initHandLandmarker();

    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Setup Webcam - Run only once
  useEffect(() => {
    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 1280,
              height: 720,
              facingMode: "user"
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Wait for metadata to load to ensure dimensions are known
            videoRef.current.onloadedmetadata = () => {
               videoRef.current?.play();
               requestRef.current = requestAnimationFrame(predictWebcam);
            };
          }
        } catch (err) {
          console.error("Webcam access denied:", err);
        }
      }
    };

    startWebcam();
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 3. Prediction Loop
  const predictWebcam = () => {
    if (!videoRef.current || !handLandmarkerRef.current) {
       requestRef.current = requestAnimationFrame(predictWebcam);
       return;
    }

    const currentTime = performance.now();
    
    // Only process if video has advanced
    if (videoRef.current.currentTime !== lastVideoTime) {
      setLastVideoTime(videoRef.current.currentTime);
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, currentTime);

      if (results.landmarks && results.landmarks.length > 0) {
        // Landmark 8 is the tip of the index finger
        const indexFingerTip = results.landmarks[0][8];
        
        // Pass normalized coordinates (0-1)
        // Webcam is mirrored visually via CSS, but data is raw. 
        // We flip X here so the cursor matches the mirrored video user sees.
        onHandMove(1 - indexFingerTip.x, indexFingerTip.y);
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="absolute top-4 right-4 z-50 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg bg-black">
      {/* Hidden processing video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover transform scale-x-[-1]"
        playsInline
        muted
      />
      <div className="absolute bottom-0 left-0 bg-black/50 text-white text-[10px] p-1 w-full text-center">
        Camera Feed
      </div>
    </div>
  );
};

export default HandTracker;