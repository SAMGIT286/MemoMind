import { useState, useRef, useEffect } from "react";
import { Camera, Trash2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Resizes and compresses an image to max 320x320 JPEG.
 * This shrinks photos from megabytes to ~15KB-30KB,
 * ensuring they never blow browser localStorage quotas or crash the application.
 */
function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        try {
          const MAX_DIM = 320;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(e.target.result);
          }

          // Pre-fill canvas with white for transparent backgrounds (PNG/GIF)
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 0.82 quality gives crisp visuals with a ~15KB-30KB payload
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          resolve(compressed);
        } catch (err) {
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePhotoUpload({
  photoUrl,
  userName = "MemoMind User",
  onPhotoChange,
  size = "xl", // "sm", "md", "lg", "xl"
  allowRemove = true,
  autoSave = true,
}) {
  const { user, updateUser } = useAuth();
  const [preview, setPreview] = useState(photoUrl || user?.photoUrl || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(photoUrl || user?.photoUrl || "");
  }, [photoUrl, user?.photoUrl]);

  const activePhoto = preview || photoUrl || user?.photoUrl || "";

  const handleFileSelect = async (e) => {
    setError("");
    setSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, WebP, GIF).");
      return;
    }

    // Validation: file size (allow up to 10MB input before compression)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image size must be less than 10MB.");
      return;
    }

    try {
      const dataUrl = await compressProfilePhoto(file);
      setPreview(dataUrl);
      setSuccess("Photo updated successfully!");
      setTimeout(() => setSuccess(""), 3000);

      if (onPhotoChange) {
        onPhotoChange(dataUrl);
      }
      if (autoSave) {
        await updateUser({ photoUrl: dataUrl });
      }
    } catch (err) {
      setError(err?.message || "Failed to read image file. Please try another image.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    setPreview("");
    setError("");
    setSuccess("Photo removed.");
    setTimeout(() => setSuccess(""), 2500);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onPhotoChange) {
      onPhotoChange("");
    }
    if (autoSave) {
      try {
        await updateUser({ photoUrl: "" });
      } catch (err) {
        console.warn("Could not remove photo on backend:", err);
      }
    }
  };

  const getInitials = (name = "") => {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase() || "MM"
    );
  };

  const avatarClass = `avatar avatar-${size} profile-photo-avatar`;

  return (
    <div className="profile-photo-upload-wrapper">
      <div className="profile-photo-container">
        {activePhoto ? (
          <div className={avatarClass} style={{ overflow: "hidden", position: "relative" }}>
            <img
              src={activePhoto}
              alt={userName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div className={avatarClass}>
            {getInitials(userName || user?.name)}
          </div>
        )}

        <div className="profile-photo-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            id="profile-photo-input"
          />

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Choose image from device"
          >
            <Camera size={14} />
            <span>{activePhoto ? "Change Photo" : "Upload Photo"}</span>
          </button>

          {activePhoto && allowRemove && (
            <button
              type="button"
              className="btn btn-outline btn-sm danger-btn"
              onClick={handleRemove}
              title="Remove photo"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="photo-upload-message error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="photo-upload-message success">
          <Check size={14} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
