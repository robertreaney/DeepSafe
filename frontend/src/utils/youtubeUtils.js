// YouTube URL validation utilities

const YOUTUBE_PATTERNS = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Extract video ID from a YouTube URL
 * @param {string} url - The YouTube URL to parse
 * @returns {string|null} - The 11-character video ID, or null if invalid
 */
export const extractVideoId = (url) => {
    if (!url || typeof url !== 'string') return null;

    for (const pattern of YOUTUBE_PATTERNS) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

/**
 * Check if a URL is a valid YouTube URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid YouTube URL
 */
export const isValidYouTubeUrl = (url) => extractVideoId(url) !== null;

/**
 * Determine if a YouTube URL is a Shorts URL
 * @param {string} url - The YouTube URL to check
 * @returns {boolean} - True if it's a Shorts URL
 */
export const isYouTubeShorts = (url) => {
    if (!url || typeof url !== 'string') return false;
    return /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\//.test(url);
};

/**
 * Normalize a YouTube URL to standard watch format
 * @param {string} url - Any valid YouTube URL
 * @returns {string|null} - Standard youtube.com/watch?v= URL, or null if invalid
 */
export const normalizeYouTubeUrl = (url) => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
};

export { YOUTUBE_PATTERNS };
