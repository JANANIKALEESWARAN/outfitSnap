import React, { useEffect, useRef, useState } from "react";
import "./VirtualTryOn.css";

/*
  VirtualTryOn component
  - User can upload a photo or use camera
  - Product image is overlaid on top with controls (move/scale/rotate)
  - Download the composed image
  - Reuses parent add-to-cart logic via onAddToCart prop
*/

const constraints = { video: { width: 640, height: 480 }, audio: false };

export const VirtualTryOn = ({ productImage, productMaskImage, productName, onAddToCart, isLoggedIn }) => {
  const [mode, setMode] = useState("upload"); // 'upload' | 'camera'
  const [bgImage, setBgImage] = useState(null); // Image element for user's photo
  const [overlay, setOverlay] = useState({ scale: 1, scaleY: 1, shearY: 0, warp: 0.15, rotation: 0, x: 0, y: 0, neckX: null, neckY: null, shoulderW: null });
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 });
  const [poseReady, setPoseReady] = useState(false);
  const [segReady, setSegReady] = useState(false);
  const [handsReady, setHandsReady] = useState(false);
  const [enableOcclusion, setEnableOcclusion] = useState(true);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [userHeightCm, setUserHeightCm] = useState(170);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const productImgRef = useRef(null);
  const maskImgRef = useRef(null);
  const garmentCanvasRef = useRef(null); // cached masked garment
  const poseRef = useRef(null);
  const segRef = useRef(null);
  const handsRef = useRef(null);
  const rafRef = useRef(null);

  // Build masked garment canvas from product image and optional mask
  const prepareGarmentBitmap = () => {
    try {
      const img = productImgRef.current;
      if (!img || !img.naturalWidth) return;
      const w = img.naturalWidth, h = img.naturalHeight;
      const gc = document.createElement('canvas');
      gc.width = w; gc.height = h;
      const gctx = gc.getContext('2d');
      gctx.drawImage(img, 0, 0);

      // If we have a precomputed mask image, apply it
      const maskImg = maskImgRef.current;
      if (maskImg && maskImg.naturalWidth) {
        gctx.globalCompositeOperation = 'destination-in';
        gctx.drawImage(maskImg, 0, 0, w, h);
        gctx.globalCompositeOperation = 'source-over';
        garmentCanvasRef.current = gc;
        return;
      }

      // Auto-generate mask by sampling corner background and thresholding
      const imgData = gctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const sample = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i+1], d[i+2]]; };
      const corners = [ sample(2, 2), sample(w-3, 2), sample(2, h-3), sample(w-3, h-3) ];
      const avg = corners.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]],[0,0,0]).map(v=>v/4);
      const dist = (r,g,b)=> Math.hypot(r-avg[0], g-avg[1], b-avg[2]);
      const T = 40;
      for (let i=0;i<d.length;i+=4){
        const r=d[i], g=d[i+1], b=d[i+2];
        const nearBg = dist(r,g,b) < T || (r>240&&g>240&&b>240);
        if (nearBg) d[i+3] = 0;
      }
      const aCopy = new Uint8ClampedArray(d);
      const idx = (x,y)=> (y*w+x)*4 + 3;
      for (let y=1;y<h-1;y++){
        for (let x=1;x<w-1;x++){
          const a = aCopy[idx(x,y)];
          if (a===0) continue;
          let hole = 0;
          if (aCopy[idx(x-1,y)]===0) hole++;
          if (aCopy[idx(x+1,y)]===0) hole++;
          if (aCopy[idx(x,y-1)]===0) hole++;
          if (aCopy[idx(x,y+1)]===0) hole++;
          if (hole>0) d[idx(x,y)] = Math.min(200, a);
        }
      }
      gctx.putImageData(imgData,0,0);
      garmentCanvasRef.current = gc;
    } catch (e) {}
  };

  // Auto fit garment using pose landmarks
  const autoFit = async () => {
    try {
      if (!poseRef.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize.width; canvas.height = canvasSize.height;
      const ctx = canvas.getContext("2d");
      if (bgImage) {
        // draw with aspect preserved like render loop
        const scale = Math.min(canvas.width / bgImage.width, canvas.height / bgImage.height);
        const drawW = bgImage.width * scale;
        const drawH = bgImage.height * scale;
        const offsetX = (canvas.width - drawW) / 2;
        const offsetY = (canvas.height - drawH) / 2;
        ctx.drawImage(bgImage, offsetX, offsetY, drawW, drawH);
      } else if (mode === "camera" && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        alert('No image available to detect. Upload or capture a photo.');
        return;
      }
      const p = poseRef.current;
      let landmarks = null;
      await new Promise((resolve) => {
        p.onResults((res) => { landmarks = res.poseLandmarks; resolve(); });
        p.send({ image: canvas });
      });
      if (!landmarks || landmarks.length < 25) { alert('Could not detect body landmarks. Try another photo facing camera.'); return; }
      const L = landmarks;
      const w = canvas.width, h = canvas.height;
      let ls = L[11], rs = L[12];
      // Fallback: estimate shoulders from ears if needed
      if ((!ls || !rs) && L[7] && L[8]) {
        const le = L[7], re = L[8];
        const ex1 = (le.x||0)*w, ey1=(le.y||0)*h;
        const ex2 = (re.x||0)*w, ey2=(re.y||0)*h;
        const earW = Math.hypot(ex1-ex2, ey1-ey2);
        const midx = (ex1+ex2)/2, midy=(ey1+ey2)/2 + earW*0.9; // move down from ears to approx shoulders
        ls = { x:(midx-earW*0.9)/w, y: midy/h };
        rs = { x:(midx+earW*0.9)/w, y: midy/h };
      }
      if (!ls || !rs) { alert('Shoulders not found. Ensure your shoulders are visible.'); return; }
      const sx = (ls.x || 0) * w, sy = (ls.y || 0) * h;
      const rx = (rs.x || 0) * w, ry = (rs.y || 0) * h;
      const mx = (sx + rx) / 2, my = (sy + ry) / 2;
      const shoulderW = Math.max(10, Math.hypot(sx - rx, sy - ry));
      const base = Math.min(w, h) * 0.6;
      const desiredOverlayW = shoulderW * 1.8;
      const scale = Math.max(0.3, Math.min(1.8, desiredOverlayW / Math.max(base, 1)));
      const angleDeg = (Math.atan2(ry - sy, rx - sx) * 180) / Math.PI;
      let torsoLen = shoulderW * 1.2;
      const lh = L[23], rh = L[24];
      if (lh && rh) {
        const hx = ((lh.x||0)+(rh.x||0))/2 * w;
        const hy = ((lh.y||0)+(rh.y||0))/2 * h;
        torsoLen = Math.max(shoulderW*0.8, Math.hypot(mx - hx, my - hy));
      }
      const scaleY = Math.max(0.8, Math.min(1.6, torsoLen / Math.max(shoulderW,1)));
      // shearY based on shoulder vertical difference before rotation
      const shoulderDy = (ry - sy);
      const shearY = Math.max(-0.3, Math.min(0.3, (shoulderDy / Math.max(shoulderW, 1)) * 0.8));
      const cx = w / 2, cy = h / 2;
      // Estimate neck Y using nose and ears
      const nose = L[0];
      let neckY = my; // fallback: shoulder mid
      if (nose) {
        const noseY = (nose.y||0)*h;
        neckY = Math.min(my - shoulderW*0.15, noseY + shoulderW*0.35);
      }
      // convert neck target to overlay offset relative to canvas center
      const targetY = neckY;
      // place garment so collar sits near neck target (heuristic offset)
      const yOffset = (my - targetY) + shoulderW * 0.5;
      setOverlay((o) => ({ ...o, x: Math.round(mx - cx), y: Math.round(my - cy - yOffset), scale, scaleY, shearY, rotation: Math.round(angleDeg), neckX: mx, neckY: neckY, shoulderW }));
    } catch (e) {}
  };

  // Camera handling
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCanvasSize({ width: constraints.video.width, height: constraints.video.height });
      } catch (err) {
        console.error("Camera error:", err);
        alert("Unable to access camera. Please allow permission or use Upload mode.");
        setMode("upload");
      }
    };
    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    if (mode === "camera") startCamera(); else stopCamera();
    return () => stopCamera();
  }, [mode]);

  useEffect(() => {
    if (window.Pose || window.pose) return;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
    s.async = true;
    s.onload = () => {
      try {
        const Pose = window.Pose || window.pose;
        if (!Pose || !Pose.Pose) return;
        const p = new Pose.Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
        p.setOptions({ modelComplexity: 0, selfieMode: true, smoothLandmarks: true, enableSegmentation: false });
        poseRef.current = p;
        setPoseReady(true);
      } catch (e) {}
    };
    document.body.appendChild(s);
  }, []);

  // Load MediaPipe Hands to reinforce occlusion for hands/arms
  useEffect(() => {
    if (window.Hands || window.hands) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    s.async = true;
    s.onload = () => {
      try{
        const Hands = window.Hands || window.hands;
        if(!Hands || !Hands.Hands) return;
        const h = new Hands.Hands({ locateFile: (file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        h.setOptions({ selfieMode: true, maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        handsRef.current = h;
        setHandsReady(true);
      }catch(e){}
    };
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (window.SelfieSegmentation || window.selfieSegmentation) return;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js";
    s.async = true;
    s.onload = () => {
      try {
        const SS = window.SelfieSegmentation || window.selfieSegmentation;
        if (!SS || !SS.SelfieSegmentation) return;
        const seg = new SS.SelfieSegmentation({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
        seg.setOptions({ modelSelection: 1 }); // landscape general
        segRef.current = seg;
        setSegReady(true);
        setEnableOcclusion(true);
      } catch (e) {}
    };
    document.body.appendChild(s);
  }, []);

  // File upload -> load as Image
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        const maxW = 800, maxH = 800;
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        setCanvasSize({ width: Math.round(w * ratio), height: Math.round(h * ratio) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Capture from camera
  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const { videoWidth: w, videoHeight: h } = videoRef.current;
    setCanvasSize({ width: w, height: h });
    const temp = document.createElement("canvas");
    temp.width = w; temp.height = h;
    const ctx = temp.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = temp.toDataURL("image/png");
  };

  // Draw composition with rAF and optional occlusion
  useEffect(() => {
    const { width, height } = canvasSize; // for lint dependency clarity
    const draw = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1) capture background frame
      let frameCanvas = document.createElement("canvas");
      frameCanvas.width = canvas.width; frameCanvas.height = canvas.height;
      const fctx = frameCanvas.getContext("2d");
      if (bgImage) {
        const scale = Math.min(canvas.width / bgImage.width, canvas.height / bgImage.height);
        const drawW = bgImage.width * scale;
        const drawH = bgImage.height * scale;
        const offsetX = (canvas.width - drawW) / 2;
        const offsetY = (canvas.height - drawH) / 2;
        fctx.drawImage(bgImage, offsetX, offsetY, drawW, drawH);
        ctx.drawImage(frameCanvas, 0, 0);
      } else if (mode === "camera" && videoRef.current && !videoRef.current.paused) {
        fctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(frameCanvas, 0, 0);
      } else {
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2) draw garment overlay (use prepared garment canvas)
      const productImg = productImgRef.current;
      if (productImg) {
        let garment = garmentCanvasRef.current || productImg;

        const baseSize = Math.min(canvas.width, canvas.height) * 0.6;
        const overlayW = baseSize * (overlay.scale || 1);
        const aspect = (garment.height || productImg.naturalHeight) / Math.max((garment.width || productImg.naturalWidth),1);
        const overlayH = overlayW * aspect;
        const centerX = canvas.width / 2 + overlay.x;
        const centerY = canvas.height / 2 + overlay.y;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((overlay.rotation * Math.PI) / 180);
        // non-uniform scale and shear to approximate warping
        const sy = overlay.scaleY || 1;
        const shy = overlay.shearY || 0; // shear on Y axis
        const warp = overlay.warp || 0;  // additional piecewise vertical scaling
        ctx.transform(1, shy, 0, sy, 0, 0);
        if (warp > 0) {
          const slices = 24;
          const srcH = overlayH;
          for (let i=0;i<slices;i++){
            const t0 = i / slices;            // 0..1 top->bottom
            const t1 = (i+1) / slices;
            const ty = (t0 + t1)/2 - 0.5;     // -0.5..0.5 center
            const localScale = 1 + warp * (Math.abs(ty)*2 - 0.5); // slightly more scale at chest/hip
            const sh = (srcH / slices) * localScale;
            const sy0 = -overlayH/2 + t0*overlayH;
            const srcY = (t0) * garment.height;
            const srcSliceH = garment.height / slices;
            ctx.drawImage(
              garment,
              0, srcY, garment.width, srcSliceH,
              -overlayW/2, sy0, overlayW, sh
            );
          }
        } else {
          ctx.drawImage(garment, -overlayW / 2, -overlayH / 2, overlayW, overlayH);
        }
        // carve a small neck opening so collar doesn't overlay the neck
        if (overlay.neckX != null && overlay.neckY != null && overlay.shoulderW){
          ctx.globalCompositeOperation = 'destination-out';
          const neckLocalX = overlay.neckX - (canvas.width/2 + overlay.x);
          const neckLocalY = overlay.neckY - (canvas.height/2 + overlay.y);
          const rx = Math.max(6, overlay.shoulderW*0.22);
          const ry = Math.max(4, overlay.shoulderW*0.16);
          ctx.beginPath();
          ctx.ellipse(neckLocalX, neckLocalY, rx, ry, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
      }

      // Optional guides
      if (showGuides) {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.moveTo(canvas.width/2,0); ctx.lineTo(canvas.width/2,canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,canvas.height/2); ctx.lineTo(canvas.width,canvas.height/2); ctx.stroke();
      }

      // 3) occlusion: draw person foreground on top using mask
      if (enableOcclusion && segRef.current && (bgImage || mode==='camera')){
        const seg = segRef.current;
        let maskImg = null;
        await new Promise((resolve)=>{
          seg.onResults((res)=>{ maskImg = res.segmentationMask; resolve(); });
          seg.send({ image: frameCanvas });
        });
        if (maskImg){
          const personCanvas = document.createElement('canvas');
          personCanvas.width = canvas.width; personCanvas.height = canvas.height;
          const pc = personCanvas.getContext('2d');
          // Grow the mask a bit and blur for softer edges around hands/arms
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = canvas.width; maskCanvas.height = canvas.height;
          const mc = maskCanvas.getContext('2d');
          mc.drawImage(maskImg,0,0,canvas.width,canvas.height);
          // If hands model is ready, paint convex hulls of hands onto the mask
          if (handsRef.current) {
            const hands = handsRef.current;
            let handsData = null;
            await new Promise((resolve)=>{
              hands.onResults((res)=>{ handsData = res.multiHandLandmarks || []; resolve(); });
              hands.send({ image: frameCanvas });
            });
            if (handsData && handsData.length) {
              mc.fillStyle = '#fff';
              mc.globalAlpha = 1.0;
              handsData.forEach(points=>{
                if (!points || points.length===0) return;
                mc.beginPath();
                const scaleX = canvas.width, scaleY = canvas.height;
                points.forEach((p,i)=>{ const x=p.x*scaleX, y=p.y*scaleY; if(i===0) mc.moveTo(x,y); else mc.lineTo(x,y); });
                mc.closePath();
                mc.fill();
              });
            }
          }
          // simple dilation by drawing shifted copies
          const expanded = document.createElement('canvas');
          expanded.width = canvas.width; expanded.height = canvas.height;
          const ex = expanded.getContext('2d');
          for (const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
            ex.drawImage(maskCanvas, dx, dy);
          }
          ex.filter = 'blur(2px)';
          ex.drawImage(expanded,0,0);
          pc.drawImage(frameCanvas,0,0);
          pc.globalCompositeOperation='destination-in';
          pc.drawImage(expanded,0,0);
          pc.globalCompositeOperation='source-over';
          ctx.drawImage(personCanvas,0,0);
        }
      }
    };

    const loop = () => {
      if (mode === 'camera') {
        draw();
        rafRef.current = requestAnimationFrame(loop);
      } else {
        draw();
      }
    };
    loop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [bgImage, mode, overlay, canvasSize.width, canvasSize.height, enableOcclusion, autoRemoveBg, showGuides]);

  // Live refresh in camera mode
  useEffect(() => {
    if (mode !== "camera") return;
    const id = setInterval(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      // redraw
      const productImg = productImgRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        if (productImg) {
          const baseSize = Math.min(canvas.width, canvas.height) * 0.6;
          const overlayW = baseSize * overlay.scale;
          const overlayH = overlayW * (productImg.naturalHeight / Math.max(productImg.naturalWidth, 1));
          const centerX = canvas.width / 2 + overlay.x;
          const centerY = canvas.height / 2 + overlay.y;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate((overlay.rotation * Math.PI) / 180);
          ctx.drawImage(productImg, -overlayW / 2, -overlayH / 2, overlayW, overlayH);
          ctx.restore();
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [mode, overlay]);

  const downloadImage = () => {
    try {
      const link = document.createElement("a");
      link.download = `${productName || "product"}-tryon.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. If product images come from a different domain, enable CORS or use same-origin images.");
    }
  };

  const handleAddToCart = () => {
    if (!onAddToCart) return;
    if (isLoggedIn) onAddToCart();
    else alert("Please login to add items to cart.");
  };

  return (
    <div className="vto">
      <h2>Virtual Try-On</h2>

      <div className="vto-mode">
        <button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>
          Upload Photo
        </button>
        <button className={mode === "camera" ? "active" : ""} onClick={() => setMode("camera")}>
          Use Camera
        </button>
      </div>

      <div className="vto-stage">
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="vto-canvas" />
        <img
          ref={productImgRef}
          src={productImage}
          alt={productName}
          crossOrigin="anonymous"
          style={{ display: "none" }}
          onLoad={() => { prepareGarmentBitmap(); setOverlay((o) => ({...o})) }}
        />
        {/* Optional precomputed mask for the product */}
        {productMaskImage ? (
          <img
            ref={maskImgRef}
            src={productMaskImage}
            alt="mask"
            crossOrigin="anonymous"
            style={{ display: "none" }}
            onLoad={() => { prepareGarmentBitmap(); setOverlay((o)=>({...o})) }}
          />
        ) : null}
      </div>

      {mode === "upload" && (
        <div className="vto-upload">
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>
      )}

      {mode === "camera" && (
        <div className="vto-camera">
          <video ref={videoRef} className="vto-video" playsInline muted />
          <button onClick={captureFromCamera}>Capture Photo</button>
        </div>
      )}

      <div className="vto-controls">
        <div className="ctrl">
          <label>Position X</label>
          <input type="range" min={-canvasSize.width/2} max={canvasSize.width/2} value={overlay.x} onChange={(e)=>setOverlay({...overlay, x:Number(e.target.value)})} />
        </div>
        <div className="ctrl">
          <label>Position Y</label>
          <input type="range" min={-canvasSize.height/2} max={canvasSize.height/2} value={overlay.y} onChange={(e)=>setOverlay({...overlay, y:Number(e.target.value)})} />
        </div>
        <div className="ctrl">
          <label>Scale</label>
          <input type="range" min={0.2} max={2} step={0.01} value={overlay.scale} onChange={(e)=>setOverlay({...overlay, scale:Number(e.target.value)})} />
        </div>
        <div className="ctrl">
          <label>Stretch Y</label>
          <input type="range" min={0.6} max={1.8} step={0.01} value={overlay.scaleY} onChange={(e)=>setOverlay({...overlay, scaleY:Number(e.target.value)})} />
        </div>
        <div className="ctrl">
          <label>Warp</label>
          <input type="range" min={0} max={0.4} step={0.005} value={overlay.warp} onChange={(e)=>setOverlay({...overlay, warp:Number(e.target.value)})} />
        </div>
        <div className="ctrl">
          <label>Rotation</label>
          <input type="range" min={-180} max={180} value={overlay.rotation} onChange={(e)=>setOverlay({...overlay, rotation:Number(e.target.value)})} />
        </div>
        <div className="ctrl">
          <button disabled={!poseReady} onClick={autoFit}>Auto Fit</button>
        </div>
        <div className="ctrl">
          <label>
            <input type="checkbox" disabled={!segReady} checked={enableOcclusion && segReady} onChange={(e)=>setEnableOcclusion(e.target.checked)} />
            Occlusion {segReady ? '' : '(loading...)'}
          </label>
        </div>
        <div className="ctrl">
          <label><input type="checkbox" checked={autoRemoveBg} onChange={(e)=>setAutoRemoveBg(e.target.checked)} /> Remove garment bg</label>
        </div>
        <div className="ctrl">
          <label><input type="checkbox" checked={showGuides} onChange={(e)=>setShowGuides(e.target.checked)} /> Show guides</label>
        </div>
        <div className="ctrl">
          <label>User height (cm)</label>
          <input type="number" value={userHeightCm} onChange={(e)=>setUserHeightCm(Number(e.target.value)||170)} style={{ width: 100 }} />
        </div>
      </div>

      <div className="vto-actions">
        <button className="btn" onClick={downloadImage}>Download Result</button>
        <button className="btn primary" onClick={handleAddToCart}>Add To Cart</button>
      </div>
    </div>
  );
};

export default VirtualTryOn;
