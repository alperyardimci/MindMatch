/**
 * Get Twemoji PNG URL for a given hex codepoint.
 * Uses PNG format (72x72) which is universally supported by React Native Image.
 */
export function getEmojiImageUrl(codepoint: string): string {
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`;
}

/**
 * Convert hex codepoint to native emoji character (fallback).
 */
export function toEmoji(codepoint: string): string {
  const codes = codepoint.split('-').map(c => parseInt(c, 16));
  return String.fromCodePoint(...codes);
}
