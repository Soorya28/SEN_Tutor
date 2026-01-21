import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import api from "../services/api";

const MODEL_URL = "/models";

function EmotionCamera({ sessionToken, captureTrigger }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // 🆕 Canvas ref
  const intervalRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState("none");
  const [warning, setWarning] = useState(""); // 🆕 Warning state

  // ---------------- LOAD MODELS ----------------
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading face-api models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log("Face-api models loaded");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
      }
    };

    loadModels();
  }, []);

  // ---------------- START CAMERA ----------------
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = stream;

        videoRef.current.onloadeddata = () => {
          console.log("Camera video ready");
        };
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };

    startCamera();
  }, []);

  // ---------------- FACE DETECTION ----------------
  const startDetection = () => {
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) return;

    // Match canvas to video dimensions
    const displaySize = {
      width: videoRef.current.width,
      height: videoRef.current.height,
    };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    intervalRef.current = setInterval(async () => {
      // Safety check if component unmounted or video not ready
      if (!videoRef.current || videoRef.current.readyState !== 4) return;

      // 🆕 DETECT ALL FACES
      const detections = await faceapi
        .detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5,
          })
        )
        .withFaceExpressions();

      if (!canvasRef.current) return;

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Clear canvas
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // 🛑 CASE 1: MULTIPLE FACES
      if (detections.length > 1) {
        setWarning("⚠️ Warning: Multiple faces detected. Only the student should be visible.");
        setDetectedEmotion("Multiple faces");
        // Draw boxes
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        return;
      }

      // 🛑 CASE 2: NO FACES
      if (detections.length === 0) {
        setWarning("");
        setDetectedEmotion("none");
        return;
      }

      // ✅ CASE 3: SINGLE FACE
      setWarning("");
      const detection = detections[0];

      // Draw Box
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

      const expressions = detection.expressions;

      // Get dominant expression
      const dominant = Object.keys(expressions).reduce((a, b) =>
        expressions[a] > expressions[b] ? a : b
      );

      setDetectedEmotion(dominant);

      // Map to learning emotion
      let mappedEmotion = "neutral";
      if (dominant === "happy") {
        mappedEmotion = "engaged";
      } else if (
        ["sad", "angry", "fearful", "disgusted"].includes(dominant)
      ) {
        mappedEmotion = "confused";
      }

      // Send to backend
      await api.post("/emotion/update", {
        session_token: sessionToken,
        emotion: mappedEmotion,
      });

    }, 200); // 200ms refresh for smoother bounding box
  };

  // ---------------- TRIGGERED CAPTURE ----------------
  useEffect(() => {
    if (captureTrigger) {
      console.log("Emotion capture triggered");
      startDetection();

      // Stop after 5 seconds
      setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setDetectedEmotion("none");
        setWarning("");
      }, 5000);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [captureTrigger, modelsLoaded]);

  return (
    <div style={{ marginBottom: "20px", position: "relative", width: "240px", height: "180px" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        width="240"
        height="180"
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          position: "absolute",
          top: 0,
          left: 0
        }}
      />

      <canvas
        ref={canvasRef}
        width="240"
        height="180"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none"
        }}
      />

      <div style={{ paddingTop: "180px" }}>
        {warning ? (
          <p style={{ color: "red", fontWeight: "bold", fontSize: "12px" }}>
            {warning}
          </p>
        ) : (
          <p style={{ fontSize: "14px", marginTop: "0.05px" }}>
            Emotion detect = <strong>{detectedEmotion}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default EmotionCamera;
