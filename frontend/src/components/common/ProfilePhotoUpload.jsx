import { useState, useRef } from "react";
import { Camera, Trash2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

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

  const activePhoto = preview || photoUrl || user?.photoUrl || "";

  const handleFileSelect = (e) => {
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

    // Validation: file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image size must be less than 5MB.");
      return;
    }

    // Read as Data URL
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (dataUrl) {
        setPreview(dataUrl);
        setSuccess("Photo updated successfully!");
        setTimeout(() => setSuccess(""), 3000);

        if (onPhotoChange) {
          onPhotoChange(dataUrl);
        }
        if (autoSave) {
          updateUser({ photoUrl: dataUrl });
        }
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file. Please try another image.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e) => {
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
      updateUser({ photoUrl: "" });
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
