import React, { useEffect, useRef, useState } from "react";
import { drawLine } from "../utils/drawingUtils";
import {
  drawRect,
  drawCircle,
  drawEllipse,
  drawTriangle,
  drawDiamond,
  drawPentagon,
} from "../utils/shapeUtils";
import TextBox from "../utils/textUtils";
import { motion, AnimatePresence } from "framer-motion";
import { Rnd } from "react-rnd";
import io from "socket.io-client";
import penCursor from "../assets/pen-cursor.png";
import eraserCursor from "../assets/eraser-cursor.png";

const socket = io("http://localhost:5000");

const Whiteboard = ({ visible, roomId }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [shape, setShape] = useState("");

  // Sync shape option changes across users
  useEffect(() => {
    socket.on("shapeOptionChange", (newShape) => {
      setShape(newShape);
    });
    return () => {
      socket.off("shapeOptionChange");
    };
  }, []);

  // Emit shape option change when shape state changes locally
  useEffect(() => {
    if (shape) {
      socket.emit("shapeOptionChange", shape);
    }
  }, [shape]);

  // Sync tool option changes across users
  const [color, setColor] = useState("#000000");
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState([]);
  const [textInputs, setTextInputs] = useState([]);
  const [fixed, setFixed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500, x: 100, y: 100 });
  const [shapes, setShapes] = useState([]);
  const [penDrawings, setPenDrawings] = useState([]);
  const [selectedShape, setSelectedShape] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const lastImage = useRef(null);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineWidth = tool === "eraser" ? 20 : 2;
    ctx.strokeStyle = color;
    ctxRef.current = ctx;

    if (lastImage.current) {
      ctx.putImageData(lastImage.current, 0, 0);
    }

    socket.emit("whiteboardJoin", roomId);

    // Enhanced whiteboard state synchronization
    socket.on("whiteboardStateSync", (whiteboardData) => {
      console.log("Received whiteboard state sync:", whiteboardData);
      if (whiteboardData.shapes) {
        setShapes(whiteboardData.shapes);
      }
      if (whiteboardData.drawings) {
        setPenDrawings(whiteboardData.drawings);
      }
      redrawCanvas();
    });

    socket.on("draw", (drawing) => {
      setPenDrawings(prev => [...prev, drawing]);
      drawLine(ctxRef.current, drawing.x0, drawing.y0, drawing.x1, drawing.y1, drawing.color, drawing.tool, drawing.width);
    });

    socket.on("shapeDraw", (shapeData) => {
      console.log("Received shapeDraw event:", shapeData);
      setShapes(prevShapes => [...prevShapes, shapeData]);
    });

    socket.on("clearCanvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lastImage.current = null;
      setUndoStack([]);
      setShapes([]);
      setPenDrawings([]);
      setSelectedShape(null);
    });

    return () => {
      socket.off("whiteboardStateSync");
      socket.off("draw");
      socket.off("shapeDraw");
      socket.off("clearCanvas");
    };
  }, [visible, dimensions, tool, color, roomId]);

  useEffect(() => {
    console.log("Shapes state updated:", shapes);
  }, [shapes]);

  // Redraw canvas when shapes or pen drawings change
  useEffect(() => {
    if (visible) {
      redrawCanvas();
    }
  }, [shapes, penDrawings, selectedShape, visible]);

  // Redraw canvas with all shapes and pen drawings
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all pen drawings
    penDrawings.forEach(drawing => {
      const { x0, y0, x1, y1, color, tool, width } = drawing;
      drawLine(ctx, x0, y0, x1, y1, color, tool, width);
    });

    // Redraw all shapes
    shapes.forEach(shapeObj => {
      const { type, x0, y0, x1, y1, color } = shapeObj;
      const shapeDrawMap = { line: drawLine, rectangle: drawRect, circle: drawCircle, ellipse: drawEllipse, triangle: drawTriangle, diamond: drawDiamond, pentagon: drawPentagon };
      if (shapeDrawMap[type]) {
        shapeDrawMap[type](ctx, x0, y0, x1, y1, color);
      }
    });

    // Draw current shape being drawn
    if (isDrawing && shape && startPoint && currentPoint) {
      const shapeDrawMap = { line: drawLine, rectangle: drawRect, circle: drawCircle, ellipse: drawEllipse, triangle: drawTriangle, diamond: drawDiamond, pentagon: drawPentagon };
      if (shapeDrawMap[shape]) {
        shapeDrawMap[shape](ctx, startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, color);
      }
    }

    // Draw selection handles for selected shape
    if (selectedShape) {
      drawSelectionHandles(ctx, selectedShape);
    }
  };

  // Draw selection handles for a shape
  const drawSelectionHandles = (ctx, shape) => {
    const { x0, y0, x1, y1 } = shape;
    const handleSize = 6;
    
    // Draw bounding box
    ctx.save();
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    ctx.setLineDash([]);
    
    // Draw handles
    ctx.fillStyle = "#007bff";
    ctx.fillRect(x0 - handleSize/2, y0 - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x1 - handleSize/2, y1 - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x0 - handleSize/2, y1 - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x1 - handleSize/2, y0 - handleSize/2, handleSize, handleSize);
    
    // Draw center handles for resizing
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    ctx.fillRect(centerX - handleSize/2, y0 - handleSize/2, handleSize, handleSize);
    ctx.fillRect(centerX - handleSize/2, y1 - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x0 - handleSize/2, centerY - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x1 - handleSize/2, centerY - handleSize/2, handleSize, handleSize);
    ctx.restore();
  };

  // Check if a point is near a shape
  const isPointNearShape = (x, y, shape) => {
    const { x0, y0, x1, y1 } = shape;
    const tolerance = 5;
    return x >= Math.min(x0, x1) - tolerance && x <= Math.max(x0, x1) + tolerance &&
           y >= Math.min(y0, y1) - tolerance && y <= Math.max(y0, y1) + tolerance;
  };

  // Check if a point is near a resize handle
  const getResizeHandle = (x, y, shape) => {
    const { x0, y0, x1, y1 } = shape;
    const handleSize = 6;
    const tolerance = handleSize + 2;
    
    // Corner handles
    if (Math.abs(x - x0) <= tolerance && Math.abs(y - y0) <= tolerance) return 'nw';
    if (Math.abs(x - x1) <= tolerance && Math.abs(y - y1) <= tolerance) return 'se';
    if (Math.abs(x - x0) <= tolerance && Math.abs(y - y1) <= tolerance) return 'sw';
    if (Math.abs(x - x1) <= tolerance && Math.abs(y - y0) <= tolerance) return 'ne';
    
    // Edge handles
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    if (Math.abs(x - centerX) <= tolerance && Math.abs(y - y0) <= tolerance) return 'n';
    if (Math.abs(x - centerX) <= tolerance && Math.abs(y - y1) <= tolerance) return 's';
    if (Math.abs(x - x0) <= tolerance && Math.abs(y - centerY) <= tolerance) return 'w';
    if (Math.abs(x - x1) <= tolerance && Math.abs(y - centerY) <= tolerance) return 'e';
    
    return null;
  };

  const handleStart = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setStartPoint({ x: offsetX, y: offsetY });
    setCurrentPoint({ x: offsetX, y: offsetY });

    // Check if clicking on a shape or resize handle
    if (!shape) {
      // Check for resize handle first
      if (selectedShape) {
        const handle = getResizeHandle(offsetX, offsetY, selectedShape);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setIsDrawing(false);
          return;
        }
      }

      // Check for shape selection
      const clickedShape = shapes.find(s => isPointNearShape(offsetX, offsetY, s));
      if (clickedShape) {
        setSelectedShape(clickedShape);
        setIsDrawing(false);
        redrawCanvas();
        return;
      } else {
        // Deselect if clicking on empty space
        setSelectedShape(null);
        redrawCanvas();
      }
    }

    setIsDrawing(true);

    if ((tool === "pen" || tool === "eraser") && !shape) {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(offsetX, offsetY);
    } else if (shape) {
      // For shapes, we'll draw interactively
      redrawCanvas();
    }
  };

  const handleMouseMove = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setCursorPosition({ x: offsetX, y: offsetY });
    
    if (!isDrawing && !isResizing) return;
    setCurrentPoint({ x: offsetX, y: offsetY });

    if (isResizing && selectedShape) {
      // Handle shape resizing
      const updatedShapes = shapes.map(s => {
        if (s.id === selectedShape.id) {
          const { x0, y0, x1, y1 } = s;
          let newX0 = x0, newY0 = y0, newX1 = x1, newY1 = y1;
          
          switch (resizeHandle) {
            case 'nw':
              newX0 = offsetX;
              newY0 = offsetY;
              break;
            case 'se':
              newX1 = offsetX;
              newY1 = offsetY;
              break;
            case 'sw':
              newX0 = offsetX;
              newY1 = offsetY;
              break;
            case 'ne':
              newX1 = offsetX;
              newY0 = offsetY;
              break;
            case 'n':
              newY0 = offsetY;
              break;
            case 's':
              newY1 = offsetY;
              break;
            case 'w':
              newX0 = offsetX;
              break;
            case 'e':
              newX1 = offsetX;
              break;
            default:
              break;
          }
          
          return { ...s, x0: newX0, y0: newY0, x1: newX1, y1: newY1 };
        }
        return s;
      });
      
      setShapes(updatedShapes);
      setSelectedShape(updatedShapes.find(s => s.id === selectedShape.id));
      redrawCanvas();
    } else if ((tool === "pen" || tool === "eraser") && !shape) {
      // Draw the line segment
      drawLine(ctxRef.current, startPoint.x, startPoint.y, offsetX, offsetY, color, tool);
      socket.emit("draw", { roomId, x0: startPoint.x, y0: startPoint.y, x1: offsetX, y1: offsetY, color, tool });
      
      // Store the line segment as a pen drawing object
      const lineWidth = tool === "eraser" ? 20 : 2;
      setPenDrawings(prev => [...prev, {
        id: Date.now() + Math.random(), // Unique ID for each segment
        x0: startPoint.x,
        y0: startPoint.y,
        x1: offsetX,
        y1: offsetY,
        color: color,
        tool: tool,
        width: lineWidth
      }]);
      
      setStartPoint({ x: offsetX, y: offsetY });
    } else if (shape) {
      // For shapes, redraw canvas with current shape
      redrawCanvas();
    }
  };

  const handleEnd = ({ nativeEvent }) => {
    if (!isDrawing && !isResizing) return;
    const { offsetX, offsetY } = nativeEvent;

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      return;
    }

    if (shape) {
      // Add shape to shapes array
      const newShape = {
        id: Date.now(),
        type: shape,
        x0: startPoint.x,
        y0: startPoint.y,
        x1: offsetX,
        y1: offsetY,
        color: color
      };
      setShapes(prev => [...prev, newShape]);
      setShape(""); // Reset shape after drawing

      // Emit shapeDraw event to sync with others
      socket.emit("shapeDraw", { roomId, ...newShape });
    }

    const snapshot = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setUndoStack(prev => [...prev, snapshot]);
    lastImage.current = snapshot;
    setIsDrawing(false);
    setCurrentPoint({ x: 0, y: 0 });
  };

  const clearCanvas = () => {
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit("clearCanvas", { roomId });
    lastImage.current = null;
    setUndoStack([]);
    setShapes([]);
    setPenDrawings([]);
    setSelectedShape(null);
  };

  const undo = () => {
    const backups = [...undoStack];
    const last = backups.pop();
    if (last) ctxRef.current.putImageData(last, 0, 0);
    setUndoStack(backups);
    lastImage.current = last || null;
    
    // Also remove the last shape if we're tracking shapes separately
    if (shapes.length > 0) {
      setShapes(prev => prev.slice(0, -1));
    }
  };

  const addTextBox = () => {
    setTextInputs(prev => [...prev, { id: Date.now(), x: 50, y: 50, width: 200, height: 100, text: "" }]);
  };

  const removeTextBox = id => setTextInputs(prev => prev.filter(t => t.id !== id));
  const updateText = (id, text) => setTextInputs(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  const updateTextPosition = (id, pos) => setTextInputs(prev => prev.map(t => t.id === id ? { ...t, ...pos } : t));

  const getCursorStyle = () => {
    if (tool === "pen") return `url(${penCursor}) 0 32, auto`;
    if (tool === "eraser") return `url(${eraserCursor}) 0 32, auto`;
    if (shape) return "crosshair";
    return "default";
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} style={{ position: "fixed", top: 0, left: 0 }}>
          <Rnd
            size={{ width: dimensions.width, height: dimensions.height }}
            position={{ x: dimensions.x, y: dimensions.y }}
            onDragStop={(e, d) => setDimensions(prev => ({ ...prev, x: d.x, y: d.y }))}
            onResizeStop={(e, dir, ref, delta, pos) => setDimensions({ width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })}
            enableResizing={!fixed}
            disableDragging={fixed}
            bounds="window"
            style={{ zIndex: 9999, backgroundColor: "#fff", border: "2px solid #ccc" }}
          >
            <div style={{ width: "100%", height: "100%" }}>
              <div className="whiteboard-toolbar">
                <button onClick={() => setFixed(prev => !prev)}>{fixed ? "Unlock" : "Lock"}</button>
                <button onClick={clearCanvas}>Clear</button>
                <button onClick={undo}>Undo</button>
                <button onClick={addTextBox}>Text Box</button>
                <button onClick={() => setDimensions(prev => ({ ...prev, height: prev.height + 100 }))}>Extend Down</button>
                <div className="tool-group">
                  <label>Tool:</label>
                  <select value={tool} onChange={e => setTool(e.target.value)}>
                    <option value="pen">Pen</option>
                    <option value="eraser">Eraser</option>
                  </select>
                </div>
                <div className="tool-group">
                  <label>Shape:</label>
                  <select value={shape} onChange={e => setShape(e.target.value)} style={{ cursor: shape ? "crosshair" : "default" }}>
                    <option value="">None</option>
                    <option value="line">Line</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="ellipse">Ellipse</option>
                    <option value="triangle">Triangle</option>
                    <option value="diamond">Diamond</option>
                    <option value="pentagon">Pentagon</option>
                  </select>
                </div>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ borderRadius: "50%", width: 32, height: 32 }} />
              </div>

              <canvas 
                ref={canvasRef} 
                style={{ cursor: getCursorStyle(), width: "100%", height: "100%" }} 
                onMouseDown={handleStart} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleEnd} 
                onMouseLeave={handleEnd} 
              />

              {textInputs.map(t => (
                <TextBox key={t.id} {...t} color={color} updateText={updateText} updatePosition={updateTextPosition} removeTextBox={() => removeTextBox(t.id)} />
              ))}
            </div>
          </Rnd>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Whiteboard;
