from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import uuid
import shutil
from pathlib import Path
import json
from typing import Dict, Optional
import tempfile
import moviepy.editor as mp
from openai import OpenAI
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.dml import MSO_THEME_COLOR
from pptx.enum.shapes import MSO_SHAPE
import whisper
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Voice-to-Slide Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job tracking
jobs: Dict[str, dict] = {}

# Load Whisper model
whisper_model = whisper.load_model("base")

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create temp directories relative to this file so the server can be launched
# from any working directory (e.g. `uvicorn backend.main:app` from the project root).
_BASE_DIR = Path(__file__).parent
UPLOAD_DIR = _BASE_DIR / "temp" / "uploads"
OUTPUT_DIR = _BASE_DIR / "temp" / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Define color themes for professional presentations
COLOR_THEMES = {
    "corporate_blue": {
        "name": "Corporate Blue",
        "background": RGBColor(240, 248, 255),  # Light blue background
        "primary": RGBColor(25, 118, 210),      # Professional blue
        "secondary": RGBColor(69, 90, 100),     # Dark gray
        "accent": RGBColor(0, 150, 136),        # Teal accent
        "text": RGBColor(33, 33, 33),           # Dark gray text
        "light_text": RGBColor(117, 117, 117)  # Light gray text
    },
    "modern_green": {
        "name": "Modern Green",
        "background": RGBColor(248, 255, 248),  # Light green background
        "primary": RGBColor(76, 175, 80),       # Modern green
        "secondary": RGBColor(55, 71, 79),      # Dark blue-gray
        "accent": RGBColor(255, 152, 0),        # Orange accent
        "text": RGBColor(33, 33, 33),           # Dark gray text
        "light_text": RGBColor(117, 117, 117)  # Light gray text
    },
    "elegant_purple": {
        "name": "Elegant Purple",
        "background": RGBColor(250, 245, 255),  # Light purple background
        "primary": RGBColor(156, 39, 176),      # Elegant purple
        "secondary": RGBColor(69, 39, 160),     # Deep purple
        "accent": RGBColor(255, 193, 7),        # Gold accent
        "text": RGBColor(33, 33, 33),           # Dark gray text
        "light_text": RGBColor(117, 117, 117)  # Light gray text
    },
    "professional_gray": {
        "name": "Professional Gray",
        "background": RGBColor(250, 250, 250),  # Light gray background
        "primary": RGBColor(96, 125, 139),      # Blue-gray
        "secondary": RGBColor(55, 71, 79),      # Dark gray
        "accent": RGBColor(255, 87, 34),        # Orange accent
        "text": RGBColor(33, 33, 33),           # Dark gray text
        "light_text": RGBColor(117, 117, 117)  # Light gray text
    }
}

def apply_slide_theme(slide, theme_colors, is_title_slide=False):
    """Apply theme colors and styling to a slide"""
    
    # Set slide background
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = theme_colors["background"]
    
    # Style title
    if slide.shapes.title:
        title_frame = slide.shapes.title.text_frame
        title_frame.clear()
        title_para = title_frame.paragraphs[0]
        title_para.alignment = PP_ALIGN.CENTER if is_title_slide else PP_ALIGN.LEFT
        
        # Set title font properties
        title_font = title_para.font
        title_font.name = "Calibri"
        title_font.size = Pt(36) if is_title_slide else Pt(28)
        title_font.bold = True
        title_font.color.rgb = theme_colors["primary"]
    
    return slide

def style_content_text(content_shape, theme_colors, content_text):
    """Style content text with professional formatting"""
    
    # Clear existing content
    content_shape.text_frame.clear()
    
    # Add content with proper formatting
    para = content_shape.text_frame.paragraphs[0]
    para.alignment = PP_ALIGN.LEFT
    
    # Set font properties
    font = para.font
    font.name = "Calibri"
    font.size = Pt(18)
    font.color.rgb = theme_colors["text"]
    
    # Add content text
    para.text = content_text
    
    # Style bullet points
    if content_text.startswith("•"):
        para.level = 0
        font.color.rgb = theme_colors["secondary"]
    
    return content_shape

def add_slide_footer(slide, slide_number, total_slides, theme_colors, presentation_title):
    """Add footer with slide number and presentation title"""
    
    # Add slide number in bottom right
    slide_num_box = slide.shapes.add_textbox(
        left=Inches(8.5), 
        top=Inches(7), 
        width=Inches(1), 
        height=Inches(0.5)
    )
    slide_num_frame = slide_num_box.text_frame
    slide_num_frame.clear()
    slide_num_para = slide_num_frame.paragraphs[0]
    slide_num_para.text = f"{slide_number}/{total_slides}"
    slide_num_para.alignment = PP_ALIGN.RIGHT
    
    # Style slide number
    slide_num_font = slide_num_para.font
    slide_num_font.name = "Calibri"
    slide_num_font.size = Pt(12)
    slide_num_font.color.rgb = theme_colors["light_text"]
    
    # Add presentation title in bottom left (except for title slide)
    if slide_number > 1:
        title_box = slide.shapes.add_textbox(
            left=Inches(0.5), 
            top=Inches(7), 
            width=Inches(6), 
            height=Inches(0.5)
        )
        title_frame = title_box.text_frame
        title_frame.clear()
        title_para = title_frame.paragraphs[0]
        title_para.text = presentation_title[:50] + "..." if len(presentation_title) > 50 else presentation_title
        title_para.alignment = PP_ALIGN.LEFT
        
        # Style footer title
        title_font = title_para.font
        title_font.name = "Calibri"
        title_font.size = Pt(10)
        title_font.color.rgb = theme_colors["light_text"]
    
    return slide

def add_decorative_elements(slide, theme_colors, is_title_slide=False):
    """Add decorative elements like lines and shapes"""
    
    if not is_title_slide:
        # Add a subtle line under the title
        line_shape = slide.shapes.add_connector(
            connector_type=1,  # Straight line
            begin_x=Inches(0.5), 
            begin_y=Inches(1.8), 
            end_x=Inches(9.5), 
            end_y=Inches(1.8)
        )
        
        # Style the line
        line = line_shape.line
        line.color.rgb = theme_colors["accent"]
        line.width = Pt(2)
    
    else:
        # Add decorative accent shape for title slide
        accent_shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            left=Inches(0.5),
            top=Inches(4.5),
            width=Inches(9),
            height=Inches(0.1)
        )
        
        # Style accent shape
        accent_fill = accent_shape.fill
        accent_fill.solid()
        accent_fill.fore_color.rgb = theme_colors["accent"]
        
        # Remove outline
        accent_shape.line.fill.background()
    
    return slide

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.mp4'):
        raise HTTPException(status_code=400, detail="Only MP4 files are supported")
    
    job_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{job_id}.mp4"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    jobs[job_id] = {
        "status": "uploaded",
        "filename": file.filename,
        "file_path": str(file_path),
        "progress": 10
    }
    
    print(f"File uploaded: {file.filename} -> {job_id}")
    return {"job_id": job_id, "message": "File uploaded successfully"}

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]

@app.get("/transcript/{job_id}")
async def get_transcript(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job["status"] == "uploaded":
        # Extract audio
        jobs[job_id]["status"] = "extracting_audio"
        jobs[job_id]["progress"] = 20
        
        try:
            video_path = job["file_path"]
            audio_path = UPLOAD_DIR / f"{job_id}.wav"
            
            video = mp.VideoFileClip(video_path)
            video.audio.write_audiofile(str(audio_path), verbose=False, logger=None)
            video.close()
            
            jobs[job_id]["status"] = "transcribing"
            jobs[job_id]["progress"] = 40
            jobs[job_id]["audio_path"] = str(audio_path)
            
            # Transcribe audio
            result = whisper_model.transcribe(str(audio_path))
            transcript = result["text"]
            
            jobs[job_id]["status"] = "transcript_ready"
            jobs[job_id]["progress"] = 60
            jobs[job_id]["transcript"] = transcript
            
            print(f"Transcription completed for job {job_id}")
            
        except Exception as e:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = str(e)
            print(f"Error processing {job_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    if "transcript" in jobs[job_id]:
        return {"transcript": jobs[job_id]["transcript"]}
    else:
        return {"message": "Transcript not ready yet"}

@app.post("/generate-slides/{job_id}")
async def generate_slides(job_id: str, theme: str = "corporate_blue"):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if "transcript" not in job:
        raise HTTPException(status_code=400, detail="Transcript not available")
    
    try:
        jobs[job_id]["status"] = "generating_slides"
        jobs[job_id]["progress"] = 70
        
        # Generate slide content using OpenAI
        transcript = job["transcript"]
        
        prompt = f"""
        Convert the following transcript into a well-structured PowerPoint presentation outline.
        Create 5-8 slides with clear titles and bullet points.
        Format as JSON with this structure:
        {{
            "title": "Presentation Title",
            "slides": [
                {{
                    "title": "Slide Title",
                    "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
                }}
            ]
        }}
        
        Transcript: {transcript}
        """
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500
        )
        
        slide_content = json.loads(response.choices[0].message.content)
        
        jobs[job_id]["status"] = "creating_powerpoint"
        jobs[job_id]["progress"] = 85
        jobs[job_id]["slide_content"] = slide_content
        
        # Get selected theme colors
        theme_colors = COLOR_THEMES.get(theme, COLOR_THEMES["corporate_blue"])
        
        # Create PowerPoint presentation
        prs = Presentation()
        
        # Calculate total slides
        total_slides = len(slide_content["slides"]) + 1
        presentation_title = slide_content["title"]
        
        # Title slide with theme
        title_slide = prs.slides.add_slide(prs.slide_layouts[0])
        title_slide = apply_slide_theme(title_slide, theme_colors, is_title_slide=True)
        
        # Set title content
        title_slide.shapes.title.text_frame.paragraphs[0].text = presentation_title
        
        # Set subtitle with theme styling
        if title_slide.placeholders[1]:
            subtitle_shape = title_slide.placeholders[1]
            subtitle_shape.text_frame.clear()
            subtitle_para = subtitle_shape.text_frame.paragraphs[0]
            subtitle_para.text = "Generated from audio transcript"
            subtitle_para.alignment = PP_ALIGN.CENTER
            subtitle_font = subtitle_para.font
            subtitle_font.name = "Calibri"
            subtitle_font.size = Pt(18)
            subtitle_font.color.rgb = theme_colors["light_text"]
        
        # Add decorative elements and footer to title slide
        title_slide = add_decorative_elements(title_slide, theme_colors, is_title_slide=True)
        title_slide = add_slide_footer(title_slide, 1, total_slides, theme_colors, presentation_title)
        
        # Content slides with theme
        for slide_index, slide_data in enumerate(slide_content["slides"]):
            slide = prs.slides.add_slide(prs.slide_layouts[1])
            slide = apply_slide_theme(slide, theme_colors, is_title_slide=False)
            
            # Set slide title
            slide.shapes.title.text_frame.paragraphs[0].text = slide_data["title"]
            
            # Style content with better formatting
            content_shape = slide.placeholders[1]
            content_shape.text_frame.clear()
            
            # Add each bullet point as a separate paragraph for better formatting
            for i, point in enumerate(slide_data["content"]):
                if i == 0:
                    para = content_shape.text_frame.paragraphs[0]
                else:
                    para = content_shape.text_frame.add_paragraph()
                
                para.text = f"• {point}"
                para.level = 0
                para.alignment = PP_ALIGN.LEFT
                
                # Style each bullet point
                font = para.font
                font.name = "Calibri"
                font.size = Pt(18)
                font.color.rgb = theme_colors["text"]
                
                # Add spacing between bullet points
                para.space_after = Pt(6)
            
            # Add decorative elements and footer to content slide
            slide = add_decorative_elements(slide, theme_colors, is_title_slide=False)
            slide = add_slide_footer(slide, slide_index + 2, total_slides, theme_colors, presentation_title)
        
        # Save PowerPoint file
        ppt_path = OUTPUT_DIR / f"{job_id}.pptx"
        prs.save(str(ppt_path))
        
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["ppt_path"] = str(ppt_path)
        
        print(f"PowerPoint generated for job {job_id}")
        
        return {"message": "Slides generated successfully", "slide_content": slide_content}
        
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"Error generating slides for {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{job_id}")
async def download_file(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job["status"] != "completed" or "ppt_path" not in job:
        raise HTTPException(status_code=400, detail="PowerPoint not ready")
    
    ppt_path = job["ppt_path"]
    
    if not os.path.exists(ppt_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=ppt_path,
        filename=f"{job['filename']}.pptx",
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

@app.get("/themes")
async def get_themes():
    """Get available presentation themes"""
    themes = {}
    for theme_id, theme_data in COLOR_THEMES.items():
        themes[theme_id] = {
            "name": theme_data["name"],
            "colors": {
                "primary": f"#{theme_data['primary'].r:02x}{theme_data['primary'].g:02x}{theme_data['primary'].b:02x}",
                "secondary": f"#{theme_data['secondary'].r:02x}{theme_data['secondary'].g:02x}{theme_data['secondary'].b:02x}",
                "accent": f"#{theme_data['accent'].r:02x}{theme_data['accent'].g:02x}{theme_data['accent'].b:02x}",
                "background": f"#{theme_data['background'].r:02x}{theme_data['background'].g:02x}{theme_data['background'].b:02x}"
            }
        }
    return {"themes": themes}

@app.get("/")
async def root():
    return {"message": "Voice-to-Slide Generator API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)