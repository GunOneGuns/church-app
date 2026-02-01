import React, { createContext, useCallback, useContext, useMemo } from "react";
import PropTypes from "prop-types";

import enCommon from "./locales/en/common.json";
import zhCNCommon from "./locales/zh-CN/common.json";

const SUPPORTED_LANGUAGES = ["en", "zh-CN"];
const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "app.language";

const resources = {
  en: { common: enCommon },
  "zh-CN": { common: zhCNCommon },
};

function getNestedValue(value, path) {
  if (!value) return undefined;
  if (!path) return value;
  const parts = String(path).split(".");
  let current = value;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function normalizeLanguage(language) {
  const next = String(language || "").trim();
  if (SUPPORTED_LANGUAGES.includes(next)) return next;
  return DEFAULT_LANGUAGE;
}

const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: () => "",
});

export function I18nProvider({ children }) {
  const [language, setLanguageState] = React.useState(() => {
    try {
      return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore (private mode / blocked storage)
    }
  }, []);

  const t = useCallback(
    (ns, key, defaultValue) => {
      const normalizedNs = ns || "common";
      const langResources = resources[language] || resources[DEFAULT_LANGUAGE];
      const fallbackResources = resources[DEFAULT_LANGUAGE];

      const primary = getNestedValue(langResources?.[normalizedNs], key);
      if (typeof primary === "string") return primary;

      const fallback = getNestedValue(fallbackResources?.[normalizedNs], key);
      if (typeof fallback === "string") return fallback;

      if (defaultValue !== undefined) return String(defaultValue);
      return String(key || "");
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

I18nProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useTranslation(ns = "common") {
  const ctx = useContext(I18nContext);
  return useMemo(
    () => ({
      language: ctx.language,
      setLanguage: ctx.setLanguage,
      t: (key, defaultValue) => ctx.t(ns, key, defaultValue),
    }),
    [ctx.language, ctx.setLanguage, ctx.t, ns],
  );
}

export const i18n = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
};

