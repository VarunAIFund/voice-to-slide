# Voice-to-Slide Generator

[![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20%2B%20GPT-412991?logo=openai&logoColor=white)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Drop in an MP4 video, get back a professionally designed PowerPoint — automatically.**

Voice-to-Slide extracts audio from any MP4 recording, transcribes it with OpenAI Whisper running locally, and uses GPT to structure the content into a polished multi-slide presentation with your choice of four professional color themes.

---

## How It Works

```
MP4 Video  ──►  Audio (WAV)  ──►  Transcript  ──►  Slide Outline  ──►  .pptx Download
           moviepy          Whisper (local)    GPT-3.5-turbo      python-pptx
```

1. **Upload** — drag-and-drop an MP4 file via the React frontend
2. **Extract** — moviepy strips the audio track to a WAV file
3. **Transcribe** — Whisper runs the model locally (no audio sent to the cloud)
4. **Structure** — GPT organizes the transcript into 5–8 titled slides with bullet points
5. **Design** — python-pptx renders the deck with your chosen theme, typography, slide numbers, and decorative elements
6. **Download** — the finished `.pptx` lands in your browser

---

## Features

### Core Pipeline
- Drag-and-drop MP4 upload with real-time progress tracking
- Local Whisper transcription — audio stays on your machine
- GPT-powered slide outlining with clean JSON output
- One-click `.pptx` download

### Professional Slide Design

Four fully styled themes ship out of the box:

| Theme | Primary | Accent | Best For |
|---|---|---|---|
| **Corporate Blue** | `#1976D2` | Teal `#009688` | Business meetings, reports |
| **Modern Green** | `#4CAF50` | Orange `#FF9800` | Tech talks, startups |
| **Elegant Purple** | `#9C27B0` | Gold `#FFC107` | Creative reviews, design |
| **Professional Gray** | `#607D8B` | Orange `#FF5722` | Academic, research |

Every generated deck includes:
- 36pt bold title slide with a themed accent bar
- 28pt slide titles with a 2pt accent rule underneath
- 18pt Calibri body text with proper bullet spacing
- Slide numbers (`current / total`) in the bottom-right corner
- Presentation title footer on all content slides

### Developer Experience
- Full hot-reload dev setup (Vite + uvicorn `--reload`)
- Interactive API docs auto-generated at `http://localhost:8000/docs`
- Transcript preview before committing to slide generation
- Slide-content JSON preview in the UI after generation

---

## Architecture

```
voice-to-slide/
├── backend/
│   ├── main.py            # FastAPI app — upload, transcribe, generate, download
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variable template
└── frontend/
    ├── src/
    │   ├── App.jsx        # Single-page React UI with theme picker
    │   ├── main.jsx       # React entry point
    │   └── index.css      # Tailwind base styles
    ├── index.html
    ├── package.json
    ├── vite.config.js     # Dev server on :3000, hot reload
    └── tailwind.config.js
```

**Backend** — FastAPI handles all heavy lifting: file I/O, Whisper inference, OpenAI API calls, and PowerPoint generation. In-memory job tracking keyed by UUID keeps the pipeline stateless per request.

**Frontend** — A lightweight React SPA communicates with the backend over a local REST API. No build-time secrets; the API base URL is a plain constant pointing to `localhost:8000`.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.8+ | |
| Node.js | 18+ | |
| FFmpeg | Any recent | Required by moviepy for audio extraction |
| OpenAI API key | — | GPT slide generation only; Whisper runs locally |

Install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows — download from https://ffmpeg.org/download.html
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/voice-to-slide.git
cd voice-to-slide
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and add your OpenAI API key
```

Your `.env` should contain:
```
OPENAI_API_KEY=sk-...
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

---

## Running the Application

Open two terminal tabs from the project root.

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate    # if using a venv
uvicorn main:app --reload
```
API running at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```
UI running at `http://localhost:3000`

---

## Usage

1. Open `http://localhost:3000`
2. Drag and drop (or click to select) an `.mp4` file
3. Click **Process Audio** — Whisper transcribes the video
4. Review the transcript in the preview panel
5. Choose a presentation theme from the visual picker
6. Click **Generate Slides** — GPT structures the content
7. Review the slide outline in the preview panel
8. Click **Download PowerPoint** to save your `.pptx`

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload an MP4 file; returns `job_id` |
| `GET` | `/status/{job_id}` | Poll job status and progress percentage |
| `GET` | `/transcript/{job_id}` | Trigger audio extraction + transcription; return text |
| `GET` | `/themes` | List available themes with hex color values |
| `POST` | `/generate-slides/{job_id}?theme=<theme>` | Generate and build the `.pptx` |
| `GET` | `/download/{job_id}` | Download the finished `.pptx` file |

Job status flow:
```
uploaded → extracting_audio → transcribing → transcript_ready
         → generating_slides → creating_powerpoint → completed
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 18 + Vite | UI and dev server |
| Styling | Tailwind CSS | Utility-first CSS |
| File upload | react-dropzone | Drag-and-drop handling |
| HTTP client | Axios | API communication |
| API framework | FastAPI | REST endpoints, async I/O |
| ASGI server | Uvicorn | Production-ready Python server |
| Speech-to-text | OpenAI Whisper | Local audio transcription |
| AI generation | OpenAI GPT-3.5-turbo | Slide content structuring |
| Presentation | python-pptx | `.pptx` file creation |
| Video processing | moviepy | Audio extraction from MP4 |
| Environment | python-dotenv | Secret management |

---

## Security Notes

- **Never commit your `.env` file.** It is excluded by `.gitignore`.
- Use `.env.example` as the template — it contains no real secrets.
- Whisper runs entirely locally; audio is never sent to an external service.
- Only the transcript text is sent to the OpenAI API for slide generation.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `FFmpeg not found` | Install FFmpeg and ensure it is on your `PATH` |
| `OpenAI API error` | Verify `OPENAI_API_KEY` in `backend/.env` |
| Upload fails immediately | Confirm the backend is running on port 8000 |
| Whisper model slow on first run | The base model (~145 MB) downloads automatically on first use |
| `CORS error` in browser | Backend must be on `localhost:8000`; frontend on `localhost:3000` |
