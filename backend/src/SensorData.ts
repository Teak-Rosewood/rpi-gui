import { Socket } from "socket.io";
import cv, { VideoCapture } from "@u4/opencv4nodejs";
import "@tensorflow/tfjs-node";
import * as faceapi from "face-api.js";
import { createCanvas, loadImage, Image } from "canvas";
import jpeg from "jpeg-js";

const maxWidth = 480;
const maxHeight = 480;

export class SensorData {
    private socket: Socket;
    private webcam: VideoCapture;
    private model_image: string;
    private limiter: number;
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
        this.model_image = "";
        this.limiter = 0;
    }

    async initModel() {
        await faceapi.nets.tinyFaceDetector.loadFromDisk("/home/blank/projects/rpi_gui/backend/weights"),
        console.log("model loaded");
        return 0;
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
                const lowQualityFrame = resizedFrame.resize(Math.round(resizedFrame.cols * 0.4), Math.round(resizedFrame.rows * 0.4));
                const original_image = cv.imencode(".jpeg", lowQualityFrame);
                if (this.limiter === 2) {
                    const data = new Uint8Array(lowQualityFrame.cvtColor(cv.COLOR_BGR2RGB).getData().buffer);
                    const imgTensor = faceapi.tf.tensor3d(data, [lowQualityFrame.rows, lowQualityFrame.cols, 3]);
                    this.runModel(imgTensor, original_image);
                    this.limiter = 0;
                }
                this.limiter++;
                this.socket.emit("newImageFrame", { original: original_image.toString("base64"), prediction: this.model_image });
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

    async runModel(faceapi_img: faceapi.tf.Tensor3D, img: Buffer) {

        const image = new Image();
        image.src = `data:image/jpeg;base64,${img.toString("base64")}`;
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(image, 0, 0, image.width, image.height);

        const detection = await faceapi.detectSingleFace(faceapi_img, new faceapi.TinyFaceDetectorOptions());

        if (detection && ctx !== null) {
            const box = detection.box;
            ctx.strokeStyle = "rgba(0,255,0,1)";
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
        }

        this.model_image = canvas.toDataURL().split(",")[1];

        return 0;
    }
}
