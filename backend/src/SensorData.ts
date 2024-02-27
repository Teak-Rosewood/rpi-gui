import { Socket } from "socket.io";
import cv, { VideoCapture } from "@u4/opencv4nodejs";
import * as tf from "@tensorflow/tfjs-node";
import * as faceDetection from "@tensorflow-models/face-detection";
import { createCanvas, loadImage } from "canvas";

const maxWidth = 480;
const maxHeight = 480;

export class SensorData {
    private socket: Socket;
    private webcam: VideoCapture;
    private detector: faceDetection.FaceDetector | null = null;

    constructor(socket: Socket) {
        this.socket = socket;
        while (true) {
            try {
                this.webcam = new cv.VideoCapture(0);
                break;
            } catch (e) {
                setTimeout(() => {}, 5000);
                console.log("Error accessing camera, Trying again in 5 Seconds...");
            }
        }
        this.initModel();
    }

    async initModel() {
        await tf.setBackend("cpu");
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        this.detector = await faceDetection.createDetector(model, {
            runtime: "tfjs",
        });
    }

    releaseCapture() {
        this.webcam.release();
    }

    startTransmission() {
        this.sendCameraData();
        this.sendTemperatureData();
        this.sendGasData();
    }

    sendCameraData() {
        if (this.webcam === null) return "";
        const CaptureLoop = async () => {
            const frame = this.webcam.read();

            if (!frame.empty) {
                const resizedFrame = frame.resize(maxWidth, maxHeight);
                const original_image = cv.imencode(".jpeg", resizedFrame, [cv.IMWRITE_JPEG_QUALITY, 20]);
                const model_image = await this.runModel(original_image);
                this.socket.emit("newImageFrame", { original: original_image.toString("base64"), prediction: model_image });
            }
            setImmediate(CaptureLoop);
        };
        CaptureLoop();
    }

    sendTemperatureData() {
        setInterval(() => {
            this.socket.emit("newTempData", { data: Math.floor(Math.random() * 1000) + 1 });
        }, 500);
    }

    sendGasData() {
        setInterval(() => {
            this.socket.emit("newGasData", { data: Math.floor(Math.random() * 1000) + 1 });
        }, 500);
    }

    async runModel(img: Buffer) {
        await tf.setBackend("tensorflow");
        const imageTensor = tf.node.decodeImage(img, 3);
        await tf.setBackend("cpu");
        const image = await loadImage(`data:image/jpeg;base64,${img.toString("base64")}`);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, image.width, image.height);

        if (this.detector === null) return "";
        if (imageTensor.rank === 3) {
            const faces = await this.detector.estimateFaces(imageTensor as tf.Tensor3D, { flipHorizontal: false });
            faces.forEach((detection) => {
                const box = detection.box;
                ctx.strokeStyle = "rgba(0,255,0,1)";
                ctx.lineWidth = 2;
                ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
            });
        }
        return canvas.toDataURL().split(",")[1];
    }
}
