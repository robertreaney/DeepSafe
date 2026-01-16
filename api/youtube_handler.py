"""
YouTube Video Handler
=====================
Utilities for extracting metadata and downloading YouTube videos.
"""

import re
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# YouTube URL patterns
YOUTUBE_PATTERNS = [
    r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
    r'(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
    r'(?:https?://)?youtu\.be/([a-zA-Z0-9_-]{11})',
]


def extract_video_id(url: str) -> Optional[str]:
    """Extract the 11-character video ID from a YouTube URL."""
    if not url or not isinstance(url, str):
        return None

    for pattern in YOUTUBE_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def is_valid_youtube_url(url: str) -> bool:
    """Check if a URL is a valid YouTube URL."""
    return extract_video_id(url) is not None


def is_youtube_short(url: str) -> bool:
    """Check if the URL is a YouTube Shorts URL."""
    if not url or not isinstance(url, str):
        return False
    return bool(re.search(r'youtube\.com/shorts/', url))


def get_video_metadata(url: str) -> Dict[str, Any]:
    """
    Fetch metadata for a YouTube video without downloading it.

    Returns a dictionary with video information including:
    - id, title, description, duration, channel info, thumbnail, etc.
    """
    try:
        import yt_dlp
    except ImportError:
        logger.error("yt-dlp is not installed")
        return {"error": "yt-dlp is not installed"}

    video_id = extract_video_id(url)
    if not video_id:
        return {"error": "Invalid YouTube URL"}

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'skip_download': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if not info:
                return {"error": "Could not extract video information"}

            # Extract relevant metadata
            duration_seconds = info.get('duration', 0) or 0

            metadata = {
                "id": info.get('id'),
                "title": info.get('title'),
                "description": info.get('description', '')[:500] if info.get('description') else None,
                "duration_seconds": duration_seconds,
                "duration_string": format_duration(duration_seconds),
                "channel": info.get('channel') or info.get('uploader'),
                "channel_id": info.get('channel_id') or info.get('uploader_id'),
                "channel_url": info.get('channel_url') or info.get('uploader_url'),
                "upload_date": info.get('upload_date'),
                "view_count": info.get('view_count'),
                "like_count": info.get('like_count'),
                "thumbnail": info.get('thumbnail'),
                "is_short": is_youtube_short(url) or (duration_seconds <= 60 and info.get('height', 0) > info.get('width', 1)),
                "width": info.get('width'),
                "height": info.get('height'),
                "fps": info.get('fps'),
                "is_live": info.get('is_live', False),
                "was_live": info.get('was_live', False),
            }

            # Add warning flags
            metadata["warnings"] = []
            if duration_seconds > 600:  # 10 minutes
                metadata["warnings"].append({
                    "type": "duration_exceeded",
                    "message": f"Video is {format_duration(duration_seconds)} long. Maximum supported length is 10 minutes."
                })
            if metadata["is_live"]:
                metadata["warnings"].append({
                    "type": "live_stream",
                    "message": "Live streams are not supported."
                })

            return metadata

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if "Private video" in error_msg:
            return {"error": "This video is private and cannot be accessed."}
        elif "Video unavailable" in error_msg:
            return {"error": "This video is unavailable."}
        elif "age" in error_msg.lower():
            return {"error": "This video is age-restricted and cannot be accessed."}
        else:
            logger.error(f"YouTube download error: {e}")
            return {"error": f"Could not access video: {error_msg[:100]}"}
    except Exception as e:
        logger.exception(f"Error fetching YouTube metadata: {e}")
        return {"error": f"Failed to fetch video metadata: {str(e)[:100]}"}


def format_duration(seconds: int) -> str:
    """Format duration in seconds to a human-readable string."""
    if not seconds:
        return "0:00"

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes}:{secs:02d}"
