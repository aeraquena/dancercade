import "./style.css";
import { PLAYER_1, SYSTEM, on } from "@rcade/plugin-input-classic";
import { JOINTS, poseLandmarker } from "./pose";
import { PoseLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <h1>Dancercade</h1>
  <p id="status">Press 1P START</p>
  <div id="controls"></div>
`;

const status = document.querySelector<HTMLParagraphElement>("#status")!;
const controls = document.querySelector<HTMLDivElement>("#controls")!;

let gameStarted = false;

/* MediaPipe declarations */

const video = document.querySelector<HTMLVideoElement>("#video")!;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d") as CanvasRenderingContext2D;
const drawingUtils = new DrawingUtils(canvasCtx as CanvasRenderingContext2D);

// getUsermedia parameters.
const constraints: MediaStreamConstraints = {
  video: true,
};

let lastVideoTime = -1;
let webcamRunning: Boolean = false;

// Process each video frame and create pose landmarker
async function predictWebcam() {
  let startTimeMs = performance.now();

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      console.log(result);

      // Drawing tools

      // Drawing utils
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      // Iterates over bodies. We have to extract indices 1-10 from each.
      for (const landmark of result.landmarks) {
        //for (const index in result.landmarks) {
        drawingUtils.drawLandmarks(landmark as NormalizedLandmark[], {
          radius: (data: any) =>
            DrawingUtils.lerp((data.from?.z ?? 0) as number, -0.15, 0.1, 5, 1),
        });
        drawingUtils.drawConnectors(
          landmark as NormalizedLandmark[],
          PoseLandmarker.POSE_CONNECTIONS as any
        );
      }
    });
  }

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function start() {
  if (!gameStarted) {
    if (SYSTEM.ONE_PLAYER) {
      gameStarted = true;
    } else if (SYSTEM.TWO_PLAYER) {
      gameStarted = true;
    }

    requestAnimationFrame(start);
  } else {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function success(stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        webcamRunning = true;
      });
  }
}

start();
