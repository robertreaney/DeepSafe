import {
    extractVideoId,
    isValidYouTubeUrl,
    isYouTubeShorts,
    normalizeYouTubeUrl,
} from './youtubeUtils';

describe('extractVideoId', () => {
    // Standard watch URLs
    test('extracts ID from standard youtube.com/watch URL', () => {
        expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    test('extracts ID from youtube.com/watch URL without www', () => {
        expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    test('extracts ID from youtube.com/watch URL without https', () => {
        expect(extractVideoId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    test('extracts ID from URL with additional query params', () => {
        expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
    });

    // Shorts URLs
    test('extracts ID from youtube.com/shorts URL', () => {
        expect(extractVideoId('https://www.youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-');
    });

    test('extracts ID from youtube.com/shorts URL without www', () => {
        expect(extractVideoId('https://youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-');
    });

    // youtu.be URLs
    test('extracts ID from youtu.be short URL', () => {
        expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    test('extracts ID from youtu.be URL without https', () => {
        expect(extractVideoId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    // Invalid URLs
    test('returns null for invalid YouTube URL', () => {
        expect(extractVideoId('https://vimeo.com/123456')).toBeNull();
    });

    test('returns null for empty string', () => {
        expect(extractVideoId('')).toBeNull();
    });

    test('returns null for null input', () => {
        expect(extractVideoId(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
        expect(extractVideoId(undefined)).toBeNull();
    });

    test('returns null for non-string input', () => {
        expect(extractVideoId(12345)).toBeNull();
    });

    test('returns null for URL with invalid video ID length', () => {
        expect(extractVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    });
});

describe('isValidYouTubeUrl', () => {
    test('returns true for valid youtube.com/watch URL', () => {
        expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    test('returns true for valid youtube.com/shorts URL', () => {
        expect(isValidYouTubeUrl('https://www.youtube.com/shorts/abc123XYZ_-')).toBe(true);
    });

    test('returns true for valid youtu.be URL', () => {
        expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    test('returns false for invalid URL', () => {
        expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
    });

    test('returns false for empty string', () => {
        expect(isValidYouTubeUrl('')).toBe(false);
    });

    test('returns false for random text', () => {
        expect(isValidYouTubeUrl('not a url at all')).toBe(false);
    });
});

describe('isYouTubeShorts', () => {
    test('returns true for Shorts URL', () => {
        expect(isYouTubeShorts('https://www.youtube.com/shorts/abc123XYZ_-')).toBe(true);
    });

    test('returns true for Shorts URL without www', () => {
        expect(isYouTubeShorts('https://youtube.com/shorts/abc123XYZ_-')).toBe(true);
    });

    test('returns false for standard watch URL', () => {
        expect(isYouTubeShorts('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    });

    test('returns false for youtu.be URL', () => {
        expect(isYouTubeShorts('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
    });

    test('returns false for null input', () => {
        expect(isYouTubeShorts(null)).toBe(false);
    });
});

describe('normalizeYouTubeUrl', () => {
    test('normalizes standard watch URL', () => {
        expect(normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
            .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    test('normalizes Shorts URL to watch format', () => {
        expect(normalizeYouTubeUrl('https://www.youtube.com/shorts/abc123XYZ_-'))
            .toBe('https://www.youtube.com/watch?v=abc123XYZ_-');
    });

    test('normalizes youtu.be URL to watch format', () => {
        expect(normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'))
            .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    test('returns null for invalid URL', () => {
        expect(normalizeYouTubeUrl('https://vimeo.com/123456')).toBeNull();
    });
});
