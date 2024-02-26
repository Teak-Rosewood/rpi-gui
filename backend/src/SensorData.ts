import { Socket } from "socket.io";
import cv, { VideoCapture } from "@u4/opencv4nodejs";
const maxWidth = 480;
const maxHeight = 480;
export class SensorData {
    private socket: Socket;
    private webcam: VideoCapture;

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
                const original_image = cv.imencode(".jpeg", resizedFrame, [cv.IMWRITE_JPEG_QUALITY, 20]).toString("base64");
                const model_image = await this.runModel(original_image);
                this.socket.emit("newImageFrame", { original: original_image, prediction: model_image });
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

    async runModel(img: string) {
        return img;
    }
}
