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

const colors = ["#ff0000", "#0000ff"];

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

function isLeftPerson(landmarkSet: NormalizedLandmark[]) {
  return landmarkSet[0].x > 0.5;
}

function handlePerson(landmarkSet: NormalizedLandmark[], color: string) {
  drawingUtils.drawLandmarks(landmarkSet, {
    radius: (data: any) =>
      DrawingUtils.lerp((data.from?.z ?? 0) as number, -0.15, 0.1, 5, 1),
    color: color,
  });

  drawingUtils.drawConnectors(
    landmarkSet,
    PoseLandmarker.POSE_CONNECTIONS as any
  );
}

interface ColoredPoint {
  color: string;
  landmark: NormalizedLandmark;
}

const RIGHT_ARM_POINTS = [
  JOINTS.RIGHT_SHOULDER,
  JOINTS.RIGHT_ELBOW,
  JOINTS.RIGHT_WRIST,
  JOINTS.RIGHT_PINKY,
  JOINTS.RIGHT_INDEX,
];

function transform(
  leftBody: NormalizedLandmark[],
  rightBody: NormalizedLandmark[]
): ColoredPoint[] {
  const leftBodyRightShoulder = leftBody[12];
  const rightBodyRightShoulder = rightBody[12];

  const xDelta = leftBodyRightShoulder.x - rightBodyRightShoulder.x;
  const yDelta = leftBodyRightShoulder.y - rightBodyRightShoulder.y;

  let coloredPoints: ColoredPoint[] = [];

  for (let i = 0; i < leftBody.length; i++) {
    if (RIGHT_ARM_POINTS.includes(i)) {
      // pull the point and transform it onto the right person
      // color it the RIGHT body color (blue)
      coloredPoints.push({
        color: colors[1],
        landmark: {
          x: leftBody[i].x - xDelta,
          y: leftBody[i].y - yDelta,
          z: leftBody[i].z,
          visibility: leftBody[i].visibility,
        },
      });
    } else {
      // assign the correct LEFT color
      coloredPoints.push({ color: colors[0], landmark: leftBody[i] });
    }
  }

  for (let i = 0; i < rightBody.length; i++) {
    if (RIGHT_ARM_POINTS.includes(i)) {
      // pull the point and transform it onto the right person
      // color it the RIGHT body color (blue)
      coloredPoints.push({
        color: colors[0],
        landmark: {
          x: rightBody[i].x + xDelta,
          y: rightBody[i].y + yDelta,
          z: rightBody[i].z,
          visibility: rightBody[i].visibility,
        },
      });
    } else {
      // assign the correct LEFT color
      coloredPoints.push({ color: colors[1], landmark: rightBody[i] });
    }
  }

  return coloredPoints;
}

// Process each video frame and create pose landmarker
async function predictWebcam() {
  let startTimeMs = performance.now();

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      //   console.log(result);

      // Drawing tools

      // Drawing utils
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      // Iterates over bodies. We have to extract indices 1-10 from each.
      //for (const landmark of result.landmarks) {

      if (result.landmarks.length == 2) {
        const leftPerson = isLeftPerson(result.landmarks[0])
          ? result.landmarks[0]
          : result.landmarks[1];
        const rightPerson = isLeftPerson(result.landmarks[0])
          ? result.landmarks[1]
          : result.landmarks[0];

        const coloredPoints = transform(leftPerson, rightPerson);

        coloredPoints.forEach((coloredPoint) => {
          drawingUtils.drawLandmarks([coloredPoint.landmark], {
            radius: (data: any) =>
              DrawingUtils.lerp(
                (data.from?.z ?? 0) as number,
                -0.15,
                0.1,
                5,
                1
              ),
            color: coloredPoint.color,
          });
        });

        for (let i = 0; i < result.landmarks.length; i++) {
          result.landmarks.forEach((l) => {
            drawingUtils.drawConnectors(
              l as NormalizedLandmark[],
              PoseLandmarker.POSE_CONNECTIONS as any
            );
          });
        }
      } else {
        // 1 person
        for (let i = 0; i < result.landmarks.length; i++) {
          result.landmarks.forEach((l) => {
            drawingUtils.drawLandmarks(l as NormalizedLandmark[], {
              radius: (data: any) =>
                DrawingUtils.lerp(
                  (data.from?.z ?? 0) as number,
                  -0.15,
                  0.1,
                  5,
                  1
                ),
            });
            drawingUtils.drawConnectors(
              l as NormalizedLandmark[],
              PoseLandmarker.POSE_CONNECTIONS as any
            );
          });
        }
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
