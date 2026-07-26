import { useEffect, useRef } from "react";

export default function DoodlePad({ roomId, socket }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function drawStroke({ from, to }) {
      ctx.strokeStyle = "#4b3a78";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    function handleSnapshot({ canvasData }) {
      if (!canvasData) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = canvasData;
    }

    function handleRemoteStroke({ stroke }) {
      drawStroke(stroke);
    }

    socket.on("doodle:snapshot", handleSnapshot);
    socket.on("doodle:stroke", handleRemoteStroke);

    return () => {
      socket.off("doodle:snapshot", handleSnapshot);
      socket.off("doodle:stroke", handleRemoteStroke);
    };
  }, [socket]);

  function getPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e) {
    drawing.current = true;
    lastPoint.current = getPoint(e);
  }

  function handlePointerMove(e) {
    if (!drawing.current) return;
    const point = getPoint(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#4b3a78";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    // broadcast just this incremental segment, not the whole canvas
    socket?.emit("doodle:stroke", { roomId, stroke: { from: lastPoint.current, to: point } });
    lastPoint.current = point;
  }

  function handlePointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    // persist a compact snapshot so newly-joining clients can catch up
    const canvasData = canvasRef.current.toDataURL("image/png");
    socket?.emit("doodle:save-snapshot", { roomId, canvasData });
  }

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={320}
      style={{ background: "white", borderRadius: 12, touchAction: "none", cursor: "crosshair" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
