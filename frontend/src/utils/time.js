import { useState, useEffect } from "react";

/**
 * Returns the current time of day period based on the local hour (0-23):
 * 05:00 - 11:59 -> "morning"
 * 12:00 - 16:59 -> "afternoon"
 * 17:00 - 20:59 -> "evening"
 * 21:00 - 04:59 -> "night" (evening/night)
 */
export function getTimePeriod(date = new Date()) {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) return "morning";
  if (hours >= 12 && hours < 17) return "afternoon";
  if (hours >= 17 && hours < 21) return "evening";
  return "night";
}

/**
 * Generates a localized greeting using the user's local browser time and real authenticated name.
 */
export function getGreeting(language = "English", name = "") {
  const period = getTimePeriod();
  const cleanName = name ? name.trim() : "";

  if (language === "Hindi") {
    let prefix = "नमस्ते";
    if (period === "morning") prefix = "शुभ प्रभात";
    else if (period === "afternoon") prefix = "शुभ दोपहर";
    else if (period === "evening") prefix = "शुभ संध्या";
    else prefix = "शुभ संध्या";

    return cleanName ? `${prefix}, ${cleanName}!` : `${prefix}!`;
  }

  if (language === "Marathi") {
    let prefix = "नमस्कार";
    if (period === "morning") prefix = "शुभ सकाळ";
    else if (period === "afternoon") prefix = "शुभ दुपार";
    else if (period === "evening") prefix = "शुभ संध्याकाळ";
    else prefix = "शुभ संध्याकाळ";

    return cleanName ? `${prefix}, ${cleanName}!` : `${prefix}!`;
  }

  // English
  let prefix = "Hello";
  if (period === "morning") prefix = "Good morning";
  else if (period === "afternoon") prefix = "Good afternoon";
  else if (period === "evening") prefix = "Good evening";
  else prefix = "Good evening";

  return cleanName ? `${prefix}, ${cleanName}!` : `${prefix}!`;
}

/**
 * Subtitle / welcome message tailored by language
 */
export function getWelcomeMessage(language = "English") {
  if (language === "Hindi") {
    return "मेमोमाइंड में आपका स्वागत है। यहाँ आपकी दैनिक दिनचर्या, दवा के स्मरण और यादों का सारांश है।";
  }
  if (language === "Marathi") {
    return "मेमोमाइंडमध्ये आपले स्वागत आहे. येथे आपले दैनिक वेळापत्रक, औषध स्मरणपत्रे आणि आठवणींचा सारांश आहे.";
  }
  return "Welcome back to MemoMind. Here is your daily schedule, medication reminders, and memory summary.";
}

/**
 * React hook that periodically updates the greeting in real time if the browser remains open across hour boundaries.
 */
export function useCurrentGreeting(language = "English", userName = "") {
  const [greeting, setGreeting] = useState(() => getGreeting(language, userName));

  useEffect(() => {
    setGreeting(getGreeting(language, userName));
    const interval = setInterval(() => {
      setGreeting(getGreeting(language, userName));
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [language, userName]);

  return greeting;
}

/**
 * Formats a date using language-appropriate locale (en-US, hi-IN, mr-IN)
 */
export function getLocalizedDate(date = new Date(), language = "English", options = {}) {
  const locale = language === "Hindi" ? "hi-IN" : language === "Marathi" ? "mr-IN" : "en-US";
  const defaultOpts = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };
  try {
    return (typeof date === "string" ? new Date(date) : date).toLocaleDateString(locale, defaultOpts);
  } catch {
    return (typeof date === "string" ? new Date(date) : date).toLocaleDateString("en-US", defaultOpts);
  }
}
