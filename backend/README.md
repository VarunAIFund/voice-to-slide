# Backend — Voice-to-Slide Generator

FastAPI service that handles video upload, audio extraction, Whisper transcription, GPT slide structuring, and PowerPoint generation.

## Quick start

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your OPENAI_API_KEY
uvicorn main:app --reload
```

API: `http://localhost:8000` | Docs: `http://localhost:8000/docs`

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload` | Accept MP4; return `job_id` |
| `GET` | `/status/{job_id}` | Poll status + progress (0–100) |
| `GET` | `/transcript/{job_id}` | Extract audio + transcribe; return text |
| `GET` | `/themes` | Available themes with hex colors |
| `POST` | `/generate-slides/{job_id}?theme=<id>` | GPT outline → build `.pptx` |
| `GET` | `/download/{job_id}` | Stream finished `.pptx` |

## Job lifecycle

```
uploaded → extracting_audio → transcribing → transcript_ready
         → generating_slides → creating_powerpoint → completed
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Used for GPT slide generation only |

Whisper runs fully locally — no audio is sent to any external service.

## File storage

Temporary files are written under `backend/temp/` (git-ignored):

- `temp/uploads/{job_id}.mp4` — original video
- `temp/uploads/{job_id}.wav` — extracted audio
- `temp/outputs/{job_id}.pptx` — generated presentation
