import asyncio
import os
import shutil
import uuid

import yt_dlp
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from shazamio import Shazam
from youtubesearchpython import VideosSearch

app = FastAPI(title="Music Recognizer & Downloader API")
shazam = Shazam()

UPLOAD_DIR = "uploads"
DOWNLOAD_DIR = "downloads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# serve downloaded files at http://localhost:8000/files/<name>
app.mount("/files", StaticFiles(directory=DOWNLOAD_DIR), name="files")

# allowed audio formats for upload (extension -> accepted, based on shazamio support)
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"}
ALLOWED_AUDIO_MIME_PREFIXES = ("audio/",)
# some browsers/clients send these for audio files instead of a proper audio/* mime type
ALLOWED_AUDIO_MIME_EXCEPTIONS = {"application/ogg", "video/ogg"}


def _validate_audio_file(file: UploadFile) -> None:
    """Raises HTTPException if the uploaded file is not a recognized audio format."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    content_type = (file.content_type or "").lower()

    is_valid_mime = (
        content_type.startswith(ALLOWED_AUDIO_MIME_PREFIXES)
        or content_type in ALLOWED_AUDIO_MIME_EXCEPTIONS
    )
    is_valid_ext = ext in ALLOWED_AUDIO_EXTENSIONS

    if not (is_valid_mime or is_valid_ext):
        raise HTTPException(
            status_code=400,
            detail=f"Formato de arquivo não suportado ({content_type or 'desconhecido'}). "
            f"Envie um arquivo de áudio ({', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}).",
        )


@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    """Receives an audio file, recognizes the song via Shazam and returns its metadata."""
    _validate_audio_file(file)

    ext = os.path.splitext(file.filename or "")[1].lower() or ".mp3"
    temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = await shazam.recognize(temp_path)
        track = result.get("track")
        if not track:
            raise HTTPException(status_code=404, detail="Música não reconhecida")

        title = track.get("title", "")
        artist = track.get("subtitle", "")
        return {
            "title": title,
            "artist": artist,
            "shazam_url": track.get("url"),
            "images": track.get("images", {}),
            # ready to use in the download endpoint:
            "download_endpoint": f"/download?query={artist} - {title}",
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/download")
async def download(
    query: str = Query(..., description="Ex: 'Queen - Bohemian Rhapsody'"),
):
    """Searches for the song on YouTube, downloads it as MP3, and returns the file URL."""
    search = VideosSearch(query, limit=1)
    result = search.result()
    videos = result.get("result", [])
    if not videos:
        raise HTTPException(status_code=404, detail="Nenhum vídeo encontrado")

    video_url = videos[0]["link"]

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "noplaylist": True,
    }

    loop = asyncio.get_event_loop()
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = await loop.run_in_executor(None, ydl.extract_info, video_url)
        filename = ydl.prepare_filename(info)
        mp3_path = os.path.splitext(filename)[0] + ".mp3"

    return {
        "title": info.get("title"),
        "duration": info.get("duration"),
        "url": f"/files/{os.path.basename(mp3_path)}",
        "source": video_url,
    }


@app.get("/download/file")
async def download_file(
    path: str = Query(
        ..., description="Path returned by /download, e.g. /files/Song.mp3"
    ),
):
    """Serves the file directly for download (Content-Disposition: attachment)."""
    full_path = os.path.join(DOWNLOAD_DIR, os.path.basename(path))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(full_path, filename=os.path.basename(full_path))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
