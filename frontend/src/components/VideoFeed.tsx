import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const URL = "http://localhost:3000";

const VideoFeed = () => {
    const origin_videoRef = useRef<HTMLImageElement>(null);
    const pred_videoRef = useRef<HTMLImageElement>(null);

    const [temp_sens, setTempSens] = useState("0");
    const [gas_sens, setGasSens] = useState("0");

    useEffect(() => {
        const socket = io(URL, { autoConnect: false });

        socket.connect();

        socket.on("newImageFrame", ({ original, prediction }) => {
            if (origin_videoRef.current) origin_videoRef.current.src = `data:image/jpeg;base64,${original}`;
            if (pred_videoRef.current) pred_videoRef.current.src = `data:image/jpeg;base64,${prediction}`;
        });

        socket.on("newTempData", ({ data }) => {
            setTempSens(data);
        });

        socket.on("newGasData", ({ data }) => {
            setGasSens(data);
        });

        return () => {
            console.log("disconnecting...");
            socket.disconnect();
        };
    }, [pred_videoRef, origin_videoRef]);

    return (
        <>
            <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                {" "}
                Raspberry Pi GUI
            </h1>
            <div className="flex flex-row">
                <div>
                    <h4 className="text-2xl font-bold dark:text-white">Original Image</h4>
                    <img height={480} width={480} ref={origin_videoRef} className="p-2" />
                    <h4>Gas Sensor Value</h4>
                    <div>{gas_sens}</div>
                </div>
                <div>
                    <h4 className="text-2xl font-bold dark:text-white">Prediction Image</h4>
                    <img height={480} width={480} ref={pred_videoRef} className="p-2" />
                    <h4>Tenperature Sensor Value</h4>
                    <div>{temp_sens}</div>
                </div>
            </div>
        </>
    );
};

export default VideoFeed;
