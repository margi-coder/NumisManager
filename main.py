from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database.db import init_db
from routers import auth, supplier, batch, koleksi, penjualan, laporan, album, backup, group_item

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (nothing needed)

app = FastAPI(
    title="NumisManager API",
    version="1.0.0",
    description="Sistem Manajemen dan Dashboard Koleksi Numismatik",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(auth.router)
app.include_router(supplier.router)
app.include_router(group_item.router)
app.include_router(batch.router)
app.include_router(koleksi.router)
app.include_router(penjualan.router)
app.include_router(laporan.router)
app.include_router(album.router)
app.include_router(backup.router)

# Static files setup
static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
uploads_dir = static_dir / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Templates directory
templates_dir = Path(__file__).resolve().parent / "templates"
templates_dir.mkdir(parents=True, exist_ok=True)

@app.get("/", response_class=HTMLResponse)
async def root():
    login_path = templates_dir / "login.html"
    if login_path.exists():
        return HTMLResponse(content=login_path.read_text(encoding="utf-8"))
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>NumisManager - Login</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f6f9; }
                .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 340px; text-align: center; }
                h1 { font-size: 1.5rem; color: #1a202c; margin-bottom: 0.5rem; }
                p { color: #718096; font-size: 0.9rem; margin-bottom: 1.5rem; }
                .badge { display: inline-block; background: #e2e8f0; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; color: #4a5568; margin-bottom: 1rem; }
                a { color: #3182ce; text-decoration: none; font-weight: 500; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="badge">Backend API Ready</div>
                <h1>NumisManager</h1>
                <p>Silakan akses dokumentasi API interaktif Swagger UI untuk eksplorasi endpoint:</p>
                <p><a href="/docs">Buka Dokumentasi Swagger /docs</a></p>
            </div>
        </body>
        </html>
        """
    )

@app.get("/app", response_class=HTMLResponse)
async def app_page():
    app_path = templates_dir / "app.html"
    if app_path.exists():
        return HTMLResponse(content=app_path.read_text(encoding="utf-8"))
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>NumisManager - Dashboard</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f6f9; }
                .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 380px; text-align: center; }
                h1 { font-size: 1.5rem; color: #1a202c; margin-bottom: 0.5rem; }
                p { color: #718096; font-size: 0.9rem; margin-bottom: 1.5rem; }
                a { color: #3182ce; text-decoration: none; font-weight: 500; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>NumisManager Dashboard</h1>
                <p>Template frontend app.html belum dibuat. Anda dapat mengakses endpoint laporan melalui API.</p>
                <p><a href="/api/laporan/dashboard">Cek /api/laporan/dashboard</a></p>
                <p><a href="/docs">Buka /docs</a></p>
            </div>
        </body>
        </html>
        """
    )

if __name__ == "__main__":
    print("Starting NumisManager...")
    print("Open: http://localhost:8000")
    print("Default login: admin / admin123")
    uvicorn.run(app, host="0.0.0.0", port=8000)
