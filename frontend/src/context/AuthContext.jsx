import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  getTranslation,
  getTransliteratedName,
  normalizeLanguageCode,
  getLanguageDisplayName,
  hydrateTranslationCache,
  setCachedTranslation,
  getCachedTranslation,
} from "../utils/translations";
import {
  loginUser,
  registerUser,
  updateUser as updateUserApi,
  getTranslations,
  transliterateName as transliterateNameApi,
} from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "memomind_user";
const LANG_STORAGE_KEY = "memomind_language";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const role = parsed.role || parsed.userType || "elderly";
        const language = parsed.language || parsed.preferences?.language || localStorage.getItem(LANG_STORAGE_KEY) || "English";
        const originalName = parsed.original_name || parsed.name || "";
        return { ...parsed, role, userType: role, language, original_name: originalName };
      }
      return null;
    } catch {
      return null;
    }
  });

  const [language, setLanguageState] = useState(() => {
    const raw = user?.language || localStorage.getItem(LANG_STORAGE_KEY) || "English";
    return getLanguageDisplayName(raw);
  });

  const [translatedUserName, setTranslatedUserName] = useState(() => {
    if (!user?.name) return "";
    return getTransliteratedName(user.original_name || user.name, language);
  });

  const langCode = useMemo(() => normalizeLanguageCode(language), [language]);

  // Hydrate translation cache from backend when language changes
  useEffect(() => {
    const code = normalizeLanguageCode(language);
    getTranslations(code)
      .then((res) => {
        if (res?.translations) {
          hydrateTranslationCache(res.translations, code);
        }
      })
      .catch(() => {});
  }, [language]);

  // Transliterate user name whenever user or language changes
  useEffect(() => {
    const rawName = (user?.original_name || user?.name || "").trim();
    if (!rawName) {
      setTranslatedUserName("");
      return;
    }

    const code = normalizeLanguageCode(language);
    if (code === "en") {
      setTranslatedUserName(rawName);
      return;
    }

    // 1. Check synchronous fast cache
    const cached = getTransliteratedName(rawName, language);
    if (cached && cached !== rawName) {
      setTranslatedUserName(cached);
      return;
    }

    // 2. Fetch from backend transliteration API
    let active = true;
    transliterateNameApi(rawName, code)
      .then((res) => {
        if (!active) return;
        if (res?.translated_name) {
          setTranslatedUserName(res.translated_name);
          setCachedTranslation(rawName, "en", code, "user_name", res.translated_name);
        }
      })
      .catch(() => {
        if (active) setTranslatedUserName(rawName);
      });

    return () => {
      active = false;
    };
  }, [user?.name, user?.original_name, language]);

  // Sync user changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      if (user.language && getLanguageDisplayName(user.language) !== language) {
        const fullLang = getLanguageDisplayName(user.language);
        setLanguageState(fullLang);
        localStorage.setItem(LANG_STORAGE_KEY, fullLang);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const setLanguage = (newLang) => {
    if (typeof newLang === "string" && newLang.trim().length >= 2) {
      const fullLang = getLanguageDisplayName(newLang);
      const code = normalizeLanguageCode(newLang);
      setLanguageState(fullLang);
      localStorage.setItem(LANG_STORAGE_KEY, fullLang);

      if (user) {
        const nextUser = {
          ...user,
          language: fullLang,
          preferred_language: code,
          preferences: {
            ...(user.preferences || {}),
            language: fullLang,
            preferred_language: code,
          },
        };
        setUser(nextUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));

        if (user.id) {
          updateUserApi(user.id, {
            language: fullLang,
            preferred_language: code,
            preferences: {
              ...(user.preferences || {}),
              language: fullLang,
              preferred_language: code,
            },
          }).catch(() => {});
        }
      }
    }
  };

  const login = async (email, password, role = "elderly") => {
    if (!email || !password) {
      return { success: false, error: t?.errEnterBothCredentials || "Please enter both email and password." };
    }
    const cleanEmail = email.toLowerCase().trim();

    try {
      const response = await loginUser({ email: cleanEmail, password, role });
      const authenticatedUser = response.user;
      const userLang = getLanguageDisplayName(authenticatedUser.language || authenticatedUser.preferred_language || "English");
      const normalizedUser = {
        ...authenticatedUser,
        original_name: authenticatedUser.original_name || authenticatedUser.name,
        language: userLang,
      };
      setUser(normalizedUser);
      setLanguageState(userLang);
      localStorage.setItem(LANG_STORAGE_KEY, userLang);
      return { success: true, user: normalizedUser };
    } catch (error) {
      return { success: false, error: error.message || t?.errInvalidPassword || "Login failed." };
    }
  };

  const register = async (data) => {
    const cleanEmail = (data.email || "").toLowerCase().trim();
    if (!cleanEmail || !data.password) {
      return { success: false, error: t?.errEnterBothCredentials || "Email and password are required." };
    }

    const role = data.role || data.userType || "elderly";
    const userLang = getLanguageDisplayName(data.language || language || "English");
    const code = normalizeLanguageCode(userLang);
    try {
      const response = await registerUser({
        name: data.name.trim(),
        email: cleanEmail,
        password: data.password,
        role,
        language: userLang,
        preferred_language: code,
      });
      const registeredUser = {
        ...response.user,
        original_name: response.user.name,
        language: userLang,
      };
      setUser(registeredUser);
      setLanguageState(userLang);
      localStorage.setItem(LANG_STORAGE_KEY, userLang);
      return { success: true, user: registeredUser };
    } catch (error) {
      return { success: false, error: error.message || t?.errAccountExists || "Registration failed." };
    }
  };

  const updateUser = async (patch) => {
    if (!user) return null;

    const nextRole = patch.role || patch.userType || user.role || user.userType || "elderly";
    const nextLang = getLanguageDisplayName(patch.language || user.language || language || "English");
    const origName = patch.name ? patch.name.trim() : (user.original_name || user.name);

    const next = {
      ...user,
      ...patch,
      original_name: origName,
      name: origName,
      role: nextRole,
      userType: nextRole,
      language: nextLang,
    };

    setUser(next);
    if (patch.language && getLanguageDisplayName(patch.language) !== language) {
      setLanguageState(nextLang);
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    }

    if (next.email) {
      const cleanEmail = next.email.toLowerCase().trim();
      let existingAcc = {};
      try {
        existingAcc = JSON.parse(localStorage.getItem(`memomind_account_${cleanEmail}`) || "{}");
      } catch {}
      localStorage.setItem(`memomind_account_${cleanEmail}`, JSON.stringify({ ...existingAcc, user: next }));
    }

    if (next.id) {
      return updateUserApi(next.id, patch);
    }
    return { user: next };
  };

  const logout = () => {
    setUser(null);
  };

  const transliterateName = useCallback((name) => {
    return getTransliteratedName(name, language);
  }, [language]);

  // Helper flags
  const role = user?.role || user?.userType || "elderly";
  const isElderly = role === "elderly";
  const isYoungProfessional = role === "young_professional";
  const isCaregiver = role === "caregiver";
  const isEmergencyContact = role === "emergency_contact";
  const isReadOnly = isEmergencyContact;

  // Active translation dictionary
  const t = getTranslation(language);

  // User display name (transliterated based on active language)
  const userDisplayName = translatedUserName || user?.name || "MemoMind User";

  return (
    <AuthContext.Provider
      value={{
        user,
        userDisplayName,
        role,
        isElderly,
        isYoungProfessional,
        isCaregiver,
        isEmergencyContact,
        isReadOnly,
        language,
        langCode,
        setLanguage,
        t,
        login,
        register,
        updateUser,
        logout,
        transliterateName,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
