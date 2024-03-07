import { Socket } from "socket.io";
import express from "express";
import { SensorData } from "./SensorData";
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);

let total_connections = 0;
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(express.json());
app.get("/", (req, res) => {
    res.json({
        message: "eh",
    });
});
const sensor_data: null | SensorData = null;

io.on("connection", async (socket: Socket) => {
    console.log("GUI Connected...");
    const sensor_data = new SensorData(socket);
    await sensor_data.initModel();
    sensor_data.startTransmission();
    socket.on("disconnect", () => {
        sensor_data.releaseCapture();
        console.log("GUI Disconnected...");
    });
});

server.listen(3000, () => {
    console.log("server running at http://localhost:3000");
});
