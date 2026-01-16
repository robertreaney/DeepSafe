# Plan: YouTube URL-First DeepSafe Integration

## Overview

Transform DeepSafe from a file-upload deepfake detector into a **YouTube URL-first** platform that:
1. Accepts YouTube links (including Shorts) as primary input
2. Downloads and extracts frames (1 per second)
3. Runs each frame through existing deepfake detection models
4. Performs reverse image search on frames via Google Lens/SerpApi
5. Aggregates results with worst-case logic (any fake frame = video is fake)

---

## Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW LANDING PAGE                          │
│         [ Paste YouTube URL here... ]  [Analyze]            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              API Gateway (FastAPI) - Port 8000               │
│                                                              │
│  NEW: /detect_youtube endpoint                               │
│  ├─ Validate YouTube URL                                     │
│  ├─ Extract metadata (yt-dlp)                                │
│  ├─ Download video                                           │
│  ├─ Extract frames (1 per second, downsampled)              │
│  ├─ For each frame:                                          │
│  │   ├─ Run through deepfake models (existing)              │
│  │   └─ Reverse image search (SerpApi/Google Lens)          │
│  └─ Aggregate results (worst-case)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────┐    ┌──────▼──────┐   ┌──────▼──────┐
│   Image    │    │   Reverse   │   │   Video     │
│   Models   │    │   Image     │   │   Models    │
│ (existing) │    │   Search    │   │ (existing)  │
│            │    │   (NEW)     │   │             │
│ NPR, UFD   │    │ SerpApi     │   │ CEViT       │
└────────────┘    └─────────────┘   └─────────────┘
```

---

## Implementation Plan

### Phase 1: Backend - YouTube Processing Service

#### 1.1 New Dependencies
**File:** `api/requirements.txt`
```
yt-dlp>=2024.0.0
opencv-python-headless>=4.8.0
google-search-results>=2.4.2
```

#### 1.2 YouTube Utility Module
**New File:** `api/youtube_handler.py`

Functions to implement:
- `validate_youtube_url(url: str) -> bool` - Validate URL format
- `get_video_metadata(url: str) -> dict` - Extract metadata without downloading
- `is_youtube_short(url: str, metadata: dict) -> bool` - Detect if Shorts
- `download_video(url: str, output_dir: str) -> str` - Download to temp file
- `extract_frames(video_path: str, fps: int = 1) -> List[np.ndarray]` - Extract frames
- `downsample_frame(frame: np.ndarray, max_size: int = 512) -> np.ndarray` - Resize for efficiency

#### 1.3 Reverse Image Search Module
**New File:** `api/reverse_image_search.py`

Functions to implement:
- `search_frame_google_lens(image_data: bytes, api_key: str) -> dict` - SerpApi integration
- `parse_lens_results(results: dict) -> dict` - Extract relevant matches
- `check_known_fake_sources(results: dict) -> bool` - Flag known fake image sources

#### 1.4 New API Endpoint
**File:** `api/main.py` (add ~200 lines)

```python
class YouTubeDetectInput(BaseModel):
    youtube_url: str
    threshold: Optional[float] = 0.5
    ensemble_method: Optional[str] = "stacking"
    enable_reverse_search: Optional[bool] = True
    frame_sample_rate: Optional[int] = 1  # frames per second

@app.post("/detect_youtube", tags=["YouTube"])
async def detect_youtube_video(request: Request, input_data: YouTubeDetectInput):
    """
    1. Validate YouTube URL
    2. Get metadata (title, duration, is_short)
    3. Download video to temp directory
    4. Extract frames at 1fps
    5. For each frame:
       - Run through image deepfake models
       - Run reverse image search
    6. Aggregate results (worst-case)
    7. Clean up temp files
    8. Return comprehensive results
    """
```

Response structure:
```python
{
    "request_id": "uuid",
    "youtube_url": "...",
    "video_metadata": {
        "title": "...",
        "duration_seconds": 60,
        "is_short": true,
        "channel": "...",
        "upload_date": "..."
    },
    "analysis_summary": {
        "verdict": "fake",  # worst-case across all frames
        "confidence": 0.87,
        "frames_analyzed": 60,
        "fake_frames": 3,
        "processing_time_seconds": 45.2
    },
    "frame_results": [
        {
            "frame_number": 1,
            "timestamp_seconds": 0,
            "deepfake_detection": {
                "is_fake": false,
                "probability": 0.12,
                "model_results": {...}
            },
            "reverse_image_search": {
                "matches_found": 2,
                "known_fake_source": false,
                "top_matches": [...]
            }
        },
        // ... more frames
    ],
    "flagged_frames": [...]  # frames with high fake probability
}
```

### Phase 2: Frontend - URL-First Landing Page

#### 2.1 New URLInput Component
**New File:** `frontend/src/components/URLInputSection.js`

Features:
- Large, prominent text input for URL
- Real-time URL validation (shows checkmark when valid YouTube URL)
- "Analyze" button with loading state
- Progress indicator during analysis (shows current frame being processed)
- Support for paste from clipboard

#### 2.2 Update Landing Page
**File:** `frontend/src/App.js`

Changes:
- Replace hero section with URL input as primary action
- Move file upload to secondary tab/option
- Add "or upload a file" link below URL input
- Show video metadata preview after URL validation
- Display frame-by-frame progress during analysis

New layout:
```
┌────────────────────────────────────────────────┐
│           DeepSafe                              │
│   Detect Deepfakes in YouTube Videos           │
│                                                 │
│   ┌────────────────────────────────────────┐   │
│   │ Paste YouTube URL here...           🔗 │   │
│   └────────────────────────────────────────┘   │
│              [ Analyze Video ]                  │
│                                                 │
│         ─── or upload a file ───               │
└────────────────────────────────────────────────┘
```

#### 2.3 New Results Display
**File:** `frontend/src/components/YouTubeResultsSection.js`

Features:
- Video metadata card (thumbnail, title, channel, duration)
- Overall verdict banner (worst-case result)
- Timeline visualization showing frame-by-frame results
- Expandable details for flagged frames
- Reverse image search results display
- Export functionality

### Phase 3: Configuration & Environment

#### 3.1 Environment Variables
**File:** `.env.example` (new)
```
SERPAPI_API_KEY=your_serpapi_key_here
YOUTUBE_TEMP_DIR=/tmp/deepsafe_youtube
MAX_VIDEO_DURATION_SECONDS=600  # 10 minutes
FRAME_SAMPLE_RATE=1
```

#### 3.2 Config Updates
**File:** `config/deepsafe_config.json`

Add new section:
```json
{
  "youtube": {
    "enabled": true,
    "max_duration_seconds": 600,
    "frame_sample_rate": 1,
    "temp_directory": "/tmp/deepsafe_youtube",
    "cleanup_after_analysis": true
  },
  "reverse_image_search": {
    "enabled": true,
    "provider": "serpapi_google_lens",
    "timeout_seconds": 30
  }
}
```

#### 3.3 Docker Updates
**File:** `docker-compose.yml`

Add to api service:
```yaml
environment:
  - SERPAPI_API_KEY=${SERPAPI_API_KEY}
  - YOUTUBE_TEMP_DIR=/tmp/deepsafe_youtube
volumes:
  - youtube_temp:/tmp/deepsafe_youtube
```

**File:** `api/Dockerfile`

Add:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `api/requirements.txt` | Modify | Add yt-dlp, opencv-python-headless, google-search-results |
| `api/youtube_handler.py` | Create | YouTube download & frame extraction |
| `api/reverse_image_search.py` | Create | SerpApi/Google Lens integration |
| `api/main.py` | Modify | Add /detect_youtube endpoint (~200 lines) |
| `api/Dockerfile` | Modify | Add ffmpeg for video processing |
| `config/deepsafe_config.json` | Modify | Add youtube & reverse_search config |
| `docker-compose.yml` | Modify | Add env vars, temp volume |
| `frontend/src/components/URLInputSection.js` | Create | URL input component |
| `frontend/src/components/YouTubeResultsSection.js` | Create | YouTube-specific results |
| `frontend/src/App.js` | Modify | New URL-first layout |
| `.env.example` | Create | Document required env vars |

---

## Key Implementation Details

### YouTube URL Validation
```python
import re

YOUTUBE_PATTERNS = [
    r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
    r'(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
    r'(?:https?://)?youtu\.be/([a-zA-Z0-9_-]{11})',
]

def extract_video_id(url: str) -> Optional[str]:
    for pattern in YOUTUBE_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None
```

### Frame Extraction (1 fps)
```python
import cv2

def extract_frames(video_path: str, fps: int = 1) -> List[np.ndarray]:
    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(video_fps / fps)

    frames = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            frames.append(frame)
        frame_count += 1

    cap.release()
    return frames
```

### Worst-Case Aggregation
```python
def aggregate_frame_results(frame_results: List[dict], threshold: float = 0.5) -> dict:
    fake_frames = [f for f in frame_results if f["deepfake_detection"]["probability"] >= threshold]
    max_probability = max(f["deepfake_detection"]["probability"] for f in frame_results)

    return {
        "verdict": "fake" if fake_frames else "real",
        "confidence": max_probability,
        "frames_analyzed": len(frame_results),
        "fake_frames": len(fake_frames),
        "flagged_frame_indices": [f["frame_number"] for f in fake_frames]
    }
```

---

## Verification Plan

### 1. Unit Tests
- Test YouTube URL validation with various formats
- Test video ID extraction
- Test frame extraction logic
- Test aggregation logic

### 2. Integration Tests
```bash
# Test with a known YouTube Short
curl -X POST http://localhost:8000/detect_youtube \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://youtube.com/shorts/XXXXX"}'
```

### 3. Manual Testing
1. Start services: `make start`
2. Open http://localhost:80
3. Paste a YouTube Shorts URL
4. Verify:
   - Metadata preview appears
   - Progress indicator shows frame processing
   - Results display with frame timeline
   - Flagged frames are highlighted

### 4. Edge Cases to Test
- Very long videos (should warn user)
- Private/unavailable videos (graceful error)
- Non-YouTube URLs (validation error)
- Rate limiting on reverse image search

---

## Cost Considerations

### SerpApi (Google Lens)
- Free tier: 100 searches/month
- Paid: $50/month for 5,000 searches
- A 60-second video = 60 frames = 60 API calls

### Recommendation
- Make reverse image search **optional** (checkbox in UI)
- Default to OFF for cost control
- Or only search "suspicious" frames (probability > 0.3)

---

## Sources
- [yt-dlp PyPI](https://pypi.org/project/yt-dlp/)
- [SerpApi Google Lens](https://serpapi.com/google-lens-api)
- [YouTube Shorts Research](https://arxiv.org/html/2403.00454v1)
- [cap-from-youtube](https://pypi.org/project/cap-from-youtube/)