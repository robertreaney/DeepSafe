# DeepSafe Codebase Notes

## Overview

DeepSafe is an enterprise-grade deepfake detection platform that combines multiple ML models into an ensemble system. It uses a microservices architecture where each detection model runs in its own Docker container, orchestrated by a central FastAPI gateway.

**Core Problem Solved:** Detecting AI-generated/manipulated media (images, videos, audio) with high accuracy through model ensembling and meta-learning.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Nginx)              │
│                         Port 80                          │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              API Gateway (FastAPI) - Port 8000           │
│  - Request orchestration & validation                    │
│  - Ensemble decision fusion (Voting/Average/Stacking)    │
│  - Meta-learner integration                              │
│  - SQLite database for history                           │
│  - OAuth2 + JWT authentication                           │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────┐    ┌──────▼──────┐   ┌──────▼──────┐
│   Image    │    │    Video    │   │    Audio    │
│   Models   │    │    Models   │   │    Models   │
│            │    │             │   │             │
│ NPR (5001) │    │ CEViT(7001) │   │Vocoder(8001)│
│ UFD (5004) │    │             │   │             │
└────────────┘    └─────────────┘   └─────────────┘
```

---

## Key Components

### 1. API Gateway (`api/main.py` - 1,357 lines)
- Central orchestrator for all requests
- Routes media to appropriate model services
- Implements three ensemble methods:
  - **Voting**: Majority vote from base models
  - **Average**: Mean probability
  - **Stacking**: Trained meta-learner (best accuracy)
- Handles authentication (OAuth2 + JWT)
- Stores analysis history in SQLite

### 2. Model Services (`models/`)
Each model is isolated in its own container with:
- Independent Python/PyTorch versions
- `/health` endpoint for status checks
- `/predict` endpoint returning probability scores

**Current Models:**
| Model | Type | Port | Purpose |
|-------|------|------|---------|
| NPR DeepfakeDetection | Image | 5001 | Neural Pattern Residual artifacts |
| UniversalFakeDetect | Image | 5004 | Generalizable detection |
| Cross Efficient ViT | Video | 7001 | Vision Transformer |
| Vocoder Artifacts | Audio | 8001 | Synthesis artifact detection |

### 3. Meta-Learning System
- `meta_feature_generator.py` - Creates training data from base model outputs
- `train_meta_learner_advanced.py` - Trains stacking ensemble (LightGBM, XGBoost, etc.)
- Artifacts stored in `api/meta_model_artifacts/{media_type}/`

### 4. Frontend (`frontend/`)
- React 18 + Tailwind CSS
- Dark theme dashboard
- File upload with drag-and-drop
- Real-time results visualization
- Analysis history tracking

---

## Configuration

Central config: `config/deepsafe_config.json`

```json
{
  "api_url": "http://localhost:8000",
  "media_types": {
    "image": {
      "model_endpoints": {
        "npr_deepfakedetection": "http://npr_deepfakedetection:5001/predict",
        "universalfakedetect": "http://universalfakedetect:5004/predict"
      }
    }
  },
  "default_threshold": 0.5,
  "default_ensemble_method": "stacking"
}
```

---

## Data Flow

1. User uploads media via frontend
2. Frontend base64 encodes and POSTs to `/detect` or `/predict`
3. API validates request, generates request_id
4. API queries all relevant model services in parallel
5. Collects probabilities from each model
6. Meta-learner (if stacking) combines outputs
7. Applies threshold to determine verdict ("fake"/"real")
8. Saves to database, returns response
9. Frontend displays results with visualizations

---

## Key Files

| File | Purpose |
|------|---------|
| `api/main.py` | FastAPI gateway, all core logic |
| `api/database.py` | SQLAlchemy models |
| `deepsafe_test.py` | CLI testing tool (1,601 lines) |
| `train_meta_learner_advanced.py` | Meta-learner training |
| `config/deepsafe_config.json` | Central configuration |
| `docker-compose.yml` | Service orchestration |
| `Makefile` | Common tasks (start, stop, test) |

---

## Tech Stack

**Backend:**
- FastAPI + Uvicorn
- SQLAlchemy + SQLite
- PyTorch 2.0.1
- scikit-learn, LightGBM, XGBoost

**Frontend:**
- React 18.2.0
- Tailwind CSS 3.3.2
- Chart.js, Recharts

**Infrastructure:**
- Docker + Docker Compose
- Nginx reverse proxy

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | API info |
| `/health` | GET | System health |
| `/predict` | POST | JSON-based detection |
| `/detect` | POST | Form upload detection |
| `/register` | POST | User registration |
| `/token` | POST | Login (OAuth2) |
| `/history` | GET | Analysis history |

---

## Running the Platform

```bash
make start    # Build & start all containers
make stop     # Stop containers
make test     # Run tests
make clean    # Full cleanup
```

Frontend: http://localhost:80 (or 8888 based on docker-compose)
API: http://localhost:8000
API Docs: http://localhost:8000/docs

---

## Adding a New Model

1. Create `models/{media_type}/{model_name}/`
2. Add `Dockerfile`, `app.py` (FastAPI), `requirements.txt`
3. Implement `/health` and `/predict` endpoints
4. Add service to `docker-compose.yml`
5. Update `config/deepsafe_config.json`
6. Run `make start`

See `docs/INTEGRATING_NEW_MODELS.md` for details.

---

## Potential Improvement Areas

### Architecture
- [ ] Add async model queries (currently sync requests)
- [ ] Implement request queuing for high load
- [ ] Add Redis caching for repeated media
- [ ] Support horizontal scaling with load balancer

### Models
- [ ] Add more image models (DIRE, CNNDetection, etc.)
- [ ] Complete FakeSTormer integration
- [ ] Add face extraction preprocessing
- [ ] GPU support configuration

### API
- [ ] Rate limiting
- [ ] API key authentication (in addition to JWT)
- [ ] Batch processing endpoint
- [ ] Webhook callbacks for async processing
- [ ] Better error messages with model-specific details

### Frontend
- [ ] Real-time processing progress
- [ ] Comparison view for multiple files
- [ ] Export reports (PDF partially implemented)
- [ ] Admin dashboard for model management

### Testing
- [ ] Increase test coverage
- [ ] Add performance benchmarks
- [ ] CI/CD pipeline improvements
- [ ] Load testing suite

### Documentation
- [ ] API usage examples
- [ ] Model accuracy comparisons
- [ ] Deployment guides for cloud providers

### DevOps
- [ ] Kubernetes manifests
- [ ] Helm charts
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Log aggregation (ELK stack)

---

## Questions to Clarify with User

1. What's the primary use case? (Enterprise API, research, public tool?)
2. Expected traffic/load requirements?
3. Are there specific models they want to add?
4. GPU availability for deployment?
5. Preferred cloud platform (if any)?
6. Accuracy vs. speed priorities?
