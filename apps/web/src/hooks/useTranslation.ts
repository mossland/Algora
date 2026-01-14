'use client';

import { useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3201';

interface TranslationResult {
  original: string;
  translated: string;
  targetLanguage: string;
}

interface TranslationCache {
  [key: string]: string;
}

// In-memory cache for translations
const translationCache: TranslationCache = {};

/**
 * Hook for translating text to Korean (or other languages)
 */
export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Translate a single text
   */
  const translate = useCallback(async (
    text: string,
    targetLanguage: string = 'ko'
  ): Promise<string> => {
    // Check cache first
    const cacheKey = `${targetLanguage}:${text}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/governance-os/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, targetLanguage }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      const translated = data.translated || text;

      // Cache the result
      translationCache[cacheKey] = translated;

      return translated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation error';
      setError(message);
      return text; // Return original on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Translate multiple texts in batch
   */
  const translateBatch = useCallback(async (
    texts: string[],
    targetLanguage: string = 'ko'
  ): Promise<TranslationResult[]> => {
    // Check which texts need translation (not in cache)
    const toTranslate: string[] = [];
    const results: TranslationResult[] = [];
    const indexMap: number[] = []; // Maps toTranslate index to original index

    texts.forEach((text, i) => {
      const cacheKey = `${targetLanguage}:${text}`;
      if (translationCache[cacheKey]) {
        results[i] = {
          original: text,
          translated: translationCache[cacheKey],
          targetLanguage,
        };
      } else {
        toTranslate.push(text);
        indexMap.push(i);
      }
    });

    // If all cached, return immediately
    if (toTranslate.length === 0) {
      return results;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/governance-os/translate/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts: toTranslate, targetLanguage }),
      });

      if (!response.ok) {
        throw new Error('Batch translation failed');
      }

      const data = await response.json();

      // Process results and update cache
      data.translations.forEach((item: { original: string; translated: string }, i: number) => {
        const originalIndex = indexMap[i];
        const cacheKey = `${targetLanguage}:${item.original}`;
        translationCache[cacheKey] = item.translated;

        results[originalIndex] = {
          original: item.original,
          translated: item.translated,
          targetLanguage,
        };
      });

      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch translation error';
      setError(message);

      // Return originals on error
      indexMap.forEach((originalIndex, i) => {
        results[originalIndex] = {
          original: toTranslate[i],
          translated: toTranslate[i],
          targetLanguage,
        };
      });

      return results;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear translation cache
   */
  const clearCache = useCallback(() => {
    Object.keys(translationCache).forEach(key => {
      delete translationCache[key];
    });
  }, []);

  return {
    translate,
    translateBatch,
    clearCache,
    isLoading,
    error,
  };
}

/**
 * Hook for managing translation toggle state
 */
export function useTranslationToggle() {
  const [showTranslation, setShowTranslation] = useState(false);

  const toggle = useCallback(() => {
    setShowTranslation(prev => !prev);
  }, []);

  return {
    showTranslation,
    setShowTranslation,
    toggle,
  };
}
