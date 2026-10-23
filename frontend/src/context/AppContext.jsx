import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getUserData, saveUserData, translateBatch } from "../services/api";
import {
  detectSourceLanguage,
  getCachedTranslation,
  setCachedTranslation,
  normalizeLanguageCode,
  getLanguageDisplayName,
  getTransliteratedName,
} from "../utils/translations";

const AppContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(`memomind_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getDefaultChatMessage(lang = "English") {
  const norm = normalizeLanguageCode(lang);
  if (norm === "mr") {
    return "नमस्कार! मी मेमोमाइंड, तुमचा वैयक्तिक स्मरण आणि काळजी सहाय्यक आहे. मी आज तुम्हाला कशी मदत करू शकतो?";
  }
  if (norm === "hi") {
    return "नमस्ते! मैं मेमोमाइंड हूँ, आपका व्यक्तिगत स्मरण और देखभाल सहायक। आज मैं आपकी क्या मदद कर सकता हूँ?";
  }
  return "Hello! I'm MemoMind, your personal memory and care assistant. How can I help you today?";
}

function cleanAssistantReply(text) {
  if (!text) return "";
  return text
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, "")
    .replace(/^here(?:'s| is) (?:a )?(?:thinking|reasoning) process:[\s\S]*?\n+/i, "")
    .replace(/^(analysis|reasoning|final answer)\s*:\s*/i, "")
    .trim();
}

function getGroundedRecordReply(question, { user, medicines, appointments }, language = "English") {
  const normalized = question.toLowerCase();
  const wantsMedicines = /\b(medicine|medicines|medication|medications|pills|tablets|औषध|औषधे|दवा|दवाइयाँ)\b/.test(normalized);
  const wantsAppointments = /\b(appointment|appointments|doctor visit|doctor visits|भेट|मुलाकात|डॉक्टर)\b/.test(normalized);
  const wantsName = /\b(my name|who am i|माझे नाव|मी कोण आहे|मेरा नाम|मैं कौन हूँ)\b/.test(normalized);
  const normLang = normalizeLanguageCode(language);

  const displayName = getTransliteratedName(user?.original_name || user?.name || "", language);

  if (wantsName) {
    if (!displayName) {
      return normLang === "hi"
        ? "आपका नाम अभी सेव नहीं है।"
        : normLang === "mr"
        ? "तुमचे नाव अजून सेव्ह केलेले नाही."
        : "I don't have your name saved yet.";
    }
    return normLang === "hi"
      ? `आपका नाम ${displayName} है।`
      : normLang === "mr"
      ? `तुमचे नाव ${displayName} आहे.`
      : `Your name is ${displayName}.`;
  }

  if (wantsMedicines && /\b(what|which|list|show|have|taking|take|कोणती|काय|कोणते|क्या|कौनसी|दिखाओ|सांगा)\b/.test(normalized)) {
    if (!medicines.length) {
      return normLang === "hi"
        ? "आपकी कोई दवा अभी सेव नहीं है।"
        : normLang === "mr"
        ? "तुमची कोणतीही औषधे अजून सेव्ह केलेली नाहीत."
        : "You don't have any medicines saved yet.";
    }
    const medNames = medicines.map((item) => item.name || "Medicine").join(", ");
    return normLang === "hi"
      ? `आपकी सेव की गई दवाइयाँ: ${medNames}।`
      : normLang === "mr"
      ? `तुमची सेव्ह केलेली औषधे: ${medNames}.`
      : `Your saved medicines: ${medNames}.`;
  }

  if (wantsAppointments && /\b(what|which|when|list|show|have|upcoming|next|कधी|केव्हा|कब|अपॉइंटमेंट)\b/.test(normalized)) {
    if (!appointments.length) {
      return normLang === "hi"
        ? "आपकी कोई अपॉइंटमेंट अभी सेव नहीं है।"
        : normLang === "mr"
        ? "तुमची कोणतीही अपॉइंटमेंट अजून सेव्ह केलेली नाही."
        : "You don't have any appointments saved yet.";
    }
    const apptList = appointments.map((item) => `${item.title || "Appointment"}${item.date ? `, ${item.date}` : ""}`).join("; ");
    return normLang === "hi"
      ? `आपकी सेव की गई अपॉइंटमेंट्स: ${apptList}।`
      : normLang === "mr"
      ? `तुमच्या सेव्ह केलेल्या अपॉइंटमेंट्स: ${apptList}.`
      : `Your saved appointments: ${apptList}.`;
  }

  return null;
}

export function AppProvider({ children }) {
  const { user, isReadOnly, role, language, langCode, userDisplayName } = useAuth();
  const prefix = user?.id || "guest";
  const activeLang = language || "English";
  const targetCode = langCode || "en";

  const [medicines, setMedicines] = useState(() => readStore(`${prefix}_medicines`, []));
  const [appointments, setAppointments] = useState(() => readStore(`${prefix}_appointments`, []));
  const [memories, setMemories] = useState(() => readStore(`${prefix}_memories`, []));
  const [chat, setChat] = useState(() =>
    readStore(`${prefix}_chat`, [
      {
        id: 1,
        role: "assistant",
        text: getDefaultChatMessage(activeLang),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ])
  );
  const [notifications, setNotifications] = useState(() => readStore(`${prefix}_notifications`, []));
  const [isSending, setIsSending] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [translationVersion, setTranslationVersion] = useState(0);

  // Sync state whenever active user prefix changes
  useEffect(() => {
    setMedicines(readStore(`${prefix}_medicines`, []));
    setAppointments(readStore(`${prefix}_appointments`, []));
    setMemories(readStore(`${prefix}_memories`, []));
    setChat(
      readStore(`${prefix}_chat`, [
        {
          id: 1,
          role: "assistant",
          text: getDefaultChatMessage(activeLang),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    );
    setNotifications(readStore(`${prefix}_notifications`, []));
  }, [prefix]);

  // Update initial chat greeting if language changes and chat is untouched
  useEffect(() => {
    setChat((prev) => {
      if (prev && prev.length === 1 && prev[0].role === "assistant" && prev[0].id === 1) {
        return [{ ...prev[0], text: getDefaultChatMessage(activeLang) }];
      }
      return prev;
    });
  }, [activeLang]);

  // Fetch from backend user-data
  useEffect(() => {
    if (!user?.id) {
      setRemoteReady(false);
      return;
    }
    let active = true;
    Promise.all(["medicines", "appointments", "notifications"].map((resource) =>
      getUserData(resource, user.id).catch(() => ({ items: null }))
    )).then(([medicineData, appointmentData, notificationData]) => {
      if (!active) return;
      if (medicineData.items) setMedicines(medicineData.items);
      if (appointmentData.items) setAppointments(appointmentData.items);
      if (notificationData.items) setNotifications(notificationData.items);
      setRemoteReady(true);
    });
    return () => { active = false; };
  }, [user?.id]);

  // Persist to backend user-data
  useEffect(() => {
    if (!remoteReady || !user?.id) return;
    saveUserData("medicines", user.id, medicines).catch(() => {});
  }, [remoteReady, user?.id, medicines]);
  useEffect(() => {
    if (!remoteReady || !user?.id) return;
    saveUserData("appointments", user.id, appointments).catch(() => {});
  }, [remoteReady, user?.id, appointments]);
  useEffect(() => {
    if (!remoteReady || !user?.id) return;
    saveUserData("notifications", user.id, notifications).catch(() => {});
  }, [remoteReady, user?.id, notifications]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(`memomind_${prefix}_medicines`, JSON.stringify(medicines));
  }, [prefix, medicines]);

  useEffect(() => {
    localStorage.setItem(`memomind_${prefix}_appointments`, JSON.stringify(appointments));
  }, [prefix, appointments]);

  useEffect(() => {
    localStorage.setItem(`memomind_${prefix}_memories`, JSON.stringify(memories));
  }, [prefix, memories]);

  useEffect(() => {
    localStorage.setItem(`memomind_${prefix}_chat`, JSON.stringify(chat));
  }, [prefix, chat]);

  useEffect(() => {
    localStorage.setItem(`memomind_${prefix}_notifications`, JSON.stringify(notifications));
  }, [prefix, notifications]);

  // Background Batch Translation Worker for User-Generated Data
  const isTranslatingRef = useRef(false);
  useEffect(() => {
    if (targetCode === "en") return;

    const missingItems = [];
    const pushIfMissing = (text, srcLang, context, contentId, contentType) => {
      if (!text || typeof text !== "string" || !text.trim()) return;
      const clean = text.trim();
      const detectedSrc = normalizeLanguageCode(srcLang || detectSourceLanguage(clean, targetCode));
      if (detectedSrc === targetCode) return;

      const cached = getCachedTranslation(clean, detectedSrc, targetCode, context);
      if (!cached) {
        missingItems.push({
          text: clean,
          source_language: detectedSrc,
          context,
          content_id: contentId ? String(contentId) : null,
          content_type: contentType,
          user_id: user?.id || null,
        });
      }
    };

    // Collect missing dynamic strings from user's records
    medicines.forEach((m) => {
      pushIfMissing(m.name, m.source_language, "medicine_name", m.id, "medicine");
      pushIfMissing(m.dosage, m.source_language, "medicine_dosage", m.id, "medicine");
      pushIfMissing(m.frequency, m.source_language, "medicine_frequency", m.id, "medicine");
      pushIfMissing(m.notes, m.source_language, "medical reminder", m.id, "medicine");
    });

    appointments.forEach((a) => {
      pushIfMissing(a.title, a.source_language, "appointment_title", a.id, "appointment");
      pushIfMissing(a.doctorName, a.source_language, "user_name", a.id, "appointment");
      pushIfMissing(a.hospital || a.location, a.source_language, "location", a.id, "appointment");
      pushIfMissing(a.notes, a.source_language, "medical reminder", a.id, "appointment");
    });

    notifications.forEach((n) => {
      pushIfMissing(n.title, n.source_language, "notification_title", n.id, "notification");
      pushIfMissing(n.text, n.source_language, "notification_text", n.id, "notification");
    });

    memories.forEach((mem) => {
      pushIfMissing(mem.title, mem.source_language, "memory_title", mem.id, "memory");
    });

    if (!missingItems.length || isTranslatingRef.current) return;

    // Deduplicate missing items by text + context
    const seen = new Set();
    const uniqueMissing = [];
    missingItems.forEach((it) => {
      const k = `${it.text}||${it.source_language}||${it.context}`;
      if (!seen.has(k)) {
        seen.add(k);
        uniqueMissing.push(it);
      }
    });

    if (!uniqueMissing.length) return;

    isTranslatingRef.current = true;
    let active = true;

    translateBatch(uniqueMissing, "auto", targetCode, "user_data", user?.id)
      .then((res) => {
        if (!active) return;
        if (res?.translations && Array.isArray(res.translations)) {
          res.translations.forEach((item) => {
            if (item?.original_text && item?.translated_text) {
              setCachedTranslation(
                item.original_text,
                item.source_language || "en",
                targetCode,
                item.context || "general",
                item.translated_text
              );
            }
          });
          setTranslationVersion((v) => v + 1);
        }
      })
      .catch((err) => {
        console.warn("Dynamic user data translation error:", err);
      })
      .finally(() => {
        isTranslatingRef.current = false;
      });

    return () => {
      active = false;
      isTranslatingRef.current = false;
    };
  }, [medicines, appointments, notifications, memories, targetCode, user?.id]);

  // Record Localization Helpers
  const localizeText = useCallback((text, srcLang, context = "general") => {
    if (!text || typeof text !== "string" || !text.trim()) return text || "";
    const clean = text.trim();
    const src = normalizeLanguageCode(srcLang || detectSourceLanguage(clean, targetCode));
    if (src === targetCode) return clean;
    const cached = getCachedTranslation(clean, src, targetCode, context);
    return cached || clean;
  }, [targetCode]);

  const localizeMedicine = useCallback((m) => {
    if (!m) return m;
    const src = m.source_language || "en";
    return {
      ...m,
      name: localizeText(m.name, src, "medicine_name"),
      dosage: localizeText(m.dosage, src, "medicine_dosage"),
      frequency: localizeText(m.frequency, src, "medicine_frequency"),
      notes: localizeText(m.notes, src, "medical reminder"),
    };
  }, [localizeText]);

  const localizeAppointment = useCallback((a) => {
    if (!a) return a;
    const src = a.source_language || "en";
    return {
      ...a,
      title: localizeText(a.title, src, "appointment_title"),
      doctorName: a.doctorName ? (getTransliteratedName(a.doctorName, activeLang) || localizeText(a.doctorName, src, "user_name")) : a.doctorName,
      hospital: localizeText(a.hospital, src, "location"),
      location: localizeText(a.location, src, "location"),
      notes: localizeText(a.notes, src, "medical reminder"),
    };
  }, [localizeText, activeLang]);

  const localizeNotification = useCallback((n) => {
    if (!n) return n;
    const src = n.source_language || "en";
    return {
      ...n,
      title: localizeText(n.title, src, "notification_title"),
      text: localizeText(n.text, src, "notification_text"),
    };
  }, [localizeText]);

  const localizeMemory = useCallback((mem) => {
    if (!mem) return mem;
    const src = mem.source_language || "en";
    return {
      ...mem,
      title: localizeText(mem.title, src, "memory_title"),
    };
  }, [localizeText]);

  // Localized collections (rendered in UI without altering original store)
  const localizedMedicines = useMemo(
    () => medicines.map(localizeMedicine),
    [medicines, localizeMedicine, translationVersion]
  );

  const localizedAppointments = useMemo(
    () => appointments.map(localizeAppointment),
    [appointments, localizeAppointment, translationVersion]
  );

  const localizedNotifications = useMemo(
    () => notifications.map(localizeNotification),
    [notifications, localizeNotification, translationVersion]
  );

  const localizedMemories = useMemo(
    () => memories.map(localizeMemory),
    [memories, localizeMemory, translationVersion]
  );

  // Medicine Actions
  const addMedicine = (medicine) => {
    if (isReadOnly) return;
    const detectedSrc = detectSourceLanguage(medicine.name || medicine.notes, targetCode);
    const newMed = {
      ...medicine,
      id: Date.now(),
      status: "upcoming",
      source_language: detectedSrc,
      original_name: medicine.name,
      original_dosage: medicine.dosage,
      original_notes: medicine.notes,
    };
    setMedicines((prev) => [...prev, newMed]);
    addNotification({
      title: "New Medicine Added",
      text: `${medicine.name} (${medicine.dosage || ""}) added to your schedule.`,
      type: "medicine",
      category: "medicine",
      source_language: "en",
    });
  };

  const updateMedicine = (id, patch) => {
    if (isReadOnly) return;
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const detectedSrc = patch.name ? detectSourceLanguage(patch.name, targetCode) : m.source_language;
          return { ...m, ...patch, source_language: detectedSrc };
        }
        return m;
      })
    );
  };

  const deleteMedicine = (id) => {
    if (isReadOnly) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const markMedicineTaken = (id) => {
    if (isReadOnly) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const target = medicines.find((m) => m.id === id);
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, status: "taken", takenAt: now } : m)));

    if (target) {
      addNotification({
        title: "Medicine Taken",
        text: `You recorded taking ${target.name} at ${now}.`,
        type: "medicine",
        category: "medicine",
        source_language: "en",
      });
    }
  };

  // Appointment Actions
  const addAppointment = (appointment) => {
    if (isReadOnly) return;
    const detectedSrc = detectSourceLanguage(appointment.title || appointment.notes, targetCode);
    const newAppt = {
      ...appointment,
      id: Date.now(),
      status: "upcoming",
      source_language: detectedSrc,
      original_title: appointment.title,
      original_notes: appointment.notes,
    };
    setAppointments((prev) => [...prev, newAppt]);
    addNotification({
      title: "New Appointment Scheduled",
      text: `${appointment.title} on ${appointment.date} at ${appointment.time}.`,
      type: "appointment",
      category: "appointment",
      source_language: "en",
    });
  };

  const updateAppointment = (id, patch) => {
    if (isReadOnly) return;
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const detectedSrc = patch.title ? detectSourceLanguage(patch.title, targetCode) : a.source_language;
          return { ...a, ...patch, source_language: detectedSrc };
        }
        return a;
      })
    );
  };

  const deleteAppointment = (id) => {
    if (isReadOnly) return;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  // Memory Timeline Actions
  const addMemory = (memory) => {
    if (isReadOnly) return;
    const detectedSrc = detectSourceLanguage(memory.title, targetCode);
    const newMem = {
      ...memory,
      id: Date.now(),
      source_language: detectedSrc,
      original_title: memory.title,
      timestamp: new Date().toISOString(),
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const deleteMemory = (id) => {
    if (isReadOnly) return;
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Notification Actions
  const addNotification = (item) => {
    const detectedSrc = detectSourceLanguage(item.title || item.text, targetCode);
    const newNotif = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: item.title || "Notification",
      text: item.text || "",
      type: item.type || "general",
      category: item.category || item.type || "general",
      timestamp: "Just now",
      read: false,
      source_language: detectedSrc,
      original_title: item.title,
      original_text: item.text,
      ...item,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Chat Actions
  const clearChat = () => {
    if (isReadOnly) return;
    setChat([]);
  };

  const sendMessage = async (text) => {
    const clean = text?.trim();
    if (!clean || isSending) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage = { id: Date.now(), role: "user", text: clean, time: now };
    const historyForApi = (chat || []).slice(-10).map((m) => ({ role: m.role, content: m.text }));

    setChat((prev) => [...(prev || []), userMessage]);
    setIsSending(true);
    setAiError(null);

    const groundedReply = getGroundedRecordReply(clean, { user, medicines: localizedMedicines, appointments: localizedAppointments }, activeLang);
    if (groundedReply) {
      setChat((prev) => [
        ...(prev || []),
        {
          id: Date.now() + 1,
          role: "assistant",
          text: groundedReply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsSending(false);
      return;
    }

    const records = [
      `User Role: ${user?.role || "elderly"}`,
      `User Name: ${userDisplayName || user?.name || "User"}`,
      `Medicines: ${(localizedMedicines || []).map((m) => `${m.name} (${m.dosage}, ${m.frequency}, ${m.time}, status=${m.status}${m.takenAt ? `, takenAt=${m.takenAt}` : ""})`).join("; ") || "none"}`,
      `Appointments: ${(localizedAppointments || []).map((a) => `${a.title} with ${a.doctorName || "doctor"} on ${a.date} at ${a.time}, location=${a.location || a.hospital || "unspecified"}, status=${a.status}`).join("; ") || "none"}`,
    ].join("\n");

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `AUTHORITATIVE USER RECORDS (do not add facts to them):\n---\n${records}\n---\n\nReply entirely in ${activeLang}. If the answer is not explicitly present in the records, say that it is not saved. Do not guess, infer, or use fictional personal details. Never show analysis or reasoning. Answer briefly and directly:\n${clean}`,
          history: historyForApi,
          language: activeLang,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Unable to contact the AI service.");

      const reply = cleanAssistantReply(typeof data.reply === "string" ? data.reply : "");
      setChat((prev) => [
        ...(prev || []),
        {
          id: Date.now() + 1,
          role: "assistant",
          text: reply || "I'm here to help with your MemoMind records.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (error) {
      console.warn("MemoMind AI Backend status:", error);
      setAiError(error.message);
      setChat((prev) => [
        ...(prev || []),
        {
          id: Date.now() + 1,
          role: "assistant",
          text: `I couldn't reach the MemoMind AI backend (${error.message}). Please make sure the FastAPI server is running on ${API_URL}. In the meantime, you can manage your medicines, appointments, and timeline directly.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const value = useMemo(
    () => ({
      // Raw state
      medicines,
      appointments,
      memories,
      notifications,
      chat,
      isSending,
      aiError,
      isReadOnly,

      // Localized / Translated view for UI rendering
      localizedMedicines,
      localizedAppointments,
      localizedNotifications,
      localizedMemories,

      // Localization helpers
      localizeText,
      localizeMedicine,
      localizeAppointment,
      localizeNotification,
      localizeMemory,

      // Mutation actions
      addMedicine,
      updateMedicine,
      deleteMedicine,
      markMedicineTaken,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      addMemory,
      deleteMemory,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearNotifications,
      setNotifications,
      clearChat,
      sendMessage,
      apiUrl: API_URL,
    }),
    [
      medicines,
      appointments,
      memories,
      notifications,
      chat,
      isSending,
      aiError,
      isReadOnly,
      localizedMedicines,
      localizedAppointments,
      localizedNotifications,
      localizedMemories,
      localizeText,
      localizeMedicine,
      localizeAppointment,
      localizeNotification,
      localizeMemory,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
