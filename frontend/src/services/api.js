const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(`Unable to reach the MemoMind backend at ${API_URL}. Start the FastAPI server and try again.`);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || "Request failed");
  return data;
}

export const getObservations = (objectName, personName, limit) => {
  const params = new URLSearchParams();
  if (objectName) params.set("object", objectName);
  if (personName) params.set("person", personName);
  if (limit) params.set("limit", String(limit));
  return request(`/api/observations${params.toString() ? `?${params}` : ""}`);
};
export const deleteObservation = (observationId) =>
  request(`/api/observations/${encodeURIComponent(observationId)}`, { method: "DELETE" });
export const clearObservations = (objectName) => {
  const params = new URLSearchParams();
  if (objectName) params.set("object", objectName);
  return request(`/api/observations${params.toString() ? `?${params}` : ""}`, { method: "DELETE" });
};
export const addObservation = (data) =>
  request("/api/observations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const getSupportedClasses = () => request("/api/detection/classes");
export const getSystemStatus = () => request("/api/system/status");
export const registerUser = (user) =>
  request("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user) });
export const loginUser = (credentials) =>
  request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
export const updateUser = (userId, patch) =>
  request(`/api/auth/${encodeURIComponent(userId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
export const getUserData = (resource, userId) =>
  request(`/api/user-data/${resource}?user_id=${encodeURIComponent(userId)}`);
export const saveUserData = (resource, userId, items) =>
  request(`/api/user-data/${resource}?user_id=${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
export const analyzeImage = (file, fields = {}) => {
  const body = new FormData();
  body.append("file", file);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, String(value));
    }
  });
  return request("/api/detection/image", { method: "POST", body });
};
export const analyzeFrame = (file, fields = {}) => {
  const body = new FormData();
  body.append("file", file);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, String(value));
    }
  });
  return request("/api/detection/frame", { method: "POST", body });
};

// Translation endpoints
export const getTranslations = (language) =>
  request(`/api/translations/${encodeURIComponent(language)}`);

export const translateBatch = (items, sourceLanguage = "en", targetLanguage = "hi", context = "ui", userId = null) =>
  request("/api/translations/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      context,
      user_id: userId,
    }),
  });

export const translateSingle = (text, sourceLanguage = "en", targetLanguage = "hi", context = "general", key = null, contentId = null, contentType = "general", userId = null) =>
  request("/api/translations/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      context,
      key,
      content_id: contentId,
      content_type: contentType,
      user_id: userId,
    }),
  });

export const detectLanguage = (text) =>
  request("/api/translations/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

export const transliterateName = (name, targetLanguage = "hi", sourceLanguage = null) =>
  request("/api/translations/name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      target_language: targetLanguage,
      source_language: sourceLanguage,
    }),
  });
