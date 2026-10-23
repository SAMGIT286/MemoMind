import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Upload, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { analyzeFrame, analyzeImage } from "../services/api";

export default function FindPeople() {
  const { t } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const uploadRef = useRef(null);
  const streamRef = useRef(null);
  const frameInFlight = useRef(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [identification, setIdentification] = useState("");
  const matchingPeople = (result?.people || []).filter((item) =>
    !identification.trim()
    || item.person.toLowerCase().includes(identification.trim().toLowerCase())
  );

  useEffect(() => () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsLive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setLoading(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser.");
      setLoading(false);
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();
      setIsLive(true);
    } catch (err) {
      setError(err.name === "NotAllowedError" ? "Camera permission is required to use Find My People." : "Camera initialization error.");
      stopCamera();
    } finally {
      setLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  const analyzeLiveFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!isLive || !video?.videoWidth || !canvas || frameInFlight.current) return;
    frameInFlight.current = true;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        frameInFlight.current = false;
        return;
      }
      try {
        setResult(await analyzeFrame(
          new File([blob], "people-live-frame.jpg", { type: "image/jpeg" }),
          { include_objects: "false" }
        ));
      } catch (err) {
        setError(err.message);
      } finally {
        frameInFlight.current = false;
      }
    }, "image/jpeg", 0.75);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) return undefined;
    const timer = window.setInterval(analyzeLiveFrame, 4000);
    return () => window.clearInterval(timer);
  }, [isLive, analyzeLiveFrame]);

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setImagePreview(URL.createObjectURL(file));
    try {
      stopCamera();
      setResult(await analyzeImage(file, { include_objects: "false" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const returnToLiveFeed = () => {
    setImagePreview(null);
    setResult(null);
    startCamera();
  };

  return (
    <div className="page">
      <div className="page-heading">
        <h1>{t?.navFindPeople || "Find My People"}</h1>
        <p>Enter who you want to identify, then check the live feed.</p>
      </div>
      <section className="panel find-things-panel">
        <div className="inline-form">
          <input value={identification} onChange={(event) => setIdentification(event.target.value)} placeholder="Who are you looking for? e.g. Mom" />
          <button className="btn btn-outline" type="button" onClick={() => setIdentification("")}>Show everyone</button>
          <button className="btn btn-outline" type="button" onClick={() => uploadRef.current?.click()}><Upload size={15} /> Upload image</button>
          <input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
        </div>
        {imagePreview ? (
          <div className="camera-stage">
            <div className="detection-stage">
              <img src={imagePreview} alt="Uploaded image being identified" className="camera-preview" />
              {matchingPeople.map((item, index) => <PersonBox key={`${item.person}-${index}`} item={item} imageSize={result?.image_size} />)}
            </div>
            <button className="btn btn-outline" type="button" onClick={returnToLiveFeed}><X size={15} /> Return to live feed</button>
          </div>
        ) : <div className="camera-stage">
          <div className="detection-stage">
            <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
            {matchingPeople.map((item, index) => <PersonBox key={`${item.person}-${index}`} item={item} imageSize={result?.image_size} />)}
          </div>
        </div>}
        {loading && <div className="empty-state">Starting live camera feed…</div>}
        {error && <div className="error-note"><span>{error}</span><button type="button" className="btn btn-outline" onClick={startCamera}><RefreshCw size={13} /> Retry</button></div>}
        {result?.people?.length ? <div className="detection-results"><h2>{identification.trim() ? `Matches for "${identification}"` : "People detected"}</h2>{matchingPeople.length ? matchingPeople.map((item, index) => <div className="list-row" key={`${item.person}-${index}`}><strong>{item.person}</strong><span>{Math.round(item.confidence * 100)}% face similarity</span></div>) : <div className="empty-state">That person is not visible in the current feed.</div>}</div> : null}
        <canvas ref={canvasRef} className="camera-canvas" />
      </section>
    </div>
  );
}

function PersonBox({ item, imageSize }) {
  if (!imageSize?.width || !imageSize?.height || !item.bounding_box) return null;
  const [x1, y1, x2, y2] = item.bounding_box;
  return <div className="detection-box person-box" style={{ left: `${x1 / imageSize.width * 100}%`, top: `${y1 / imageSize.height * 100}%`, width: `${(x2 - x1) / imageSize.width * 100}%`, height: `${(y2 - y1) / imageSize.height * 100}%` }}><span>{item.person} {Math.round(item.confidence * 100)}%</span></div>;
}
