#!/usr/bin/env python3
"""
================================================================================
🪙 NumisManager - Smart Cross-Platform Runner & Environment Orchestrator
================================================================================
Single script cerdas yang berjalan di berbagai sistem operasi (Windows, Linux, macOS).
Secara otomatis mendeteksi OS, mengelola virtual environment (.venv), menginstal
dependensi, mengunduh utilitas platform jika belum ada, dan menjalankan server serta tunnel.

Penggunaan:
    python run.py               # Menjalankan server lokal (default: port 8000)
    python run.py --tunnel      # Menjalankan server + Cloudflare Tunnel publik
    python run.py --port 8080   # Menjalankan pada port khusus
    python run.py --check       # Memeriksa kesehatan lingkungan & dependensi
    python run.py --install     # Hanya menginstal dependensi tanpa menjalankan server
"""

import sys
import os
import platform
import subprocess
import shutil
import urllib.request
import re
import time
import signal
from pathlib import Path

# Force UTF-8 encoding on standard output/error streams
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Minimum Python requirement
MIN_PYTHON_VERSION = (3, 8)
ROOT_DIR = Path(__file__).resolve().parent

# ANSI Colors for beautiful cross-platform terminal output
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GOLD = "\033[38;5;220m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    GRAY = "\033[90m"

# Enable VT100 on Windows console if available
if platform.system() == "Windows":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass


def safe_print(text):
    try:
        print(text)
    except UnicodeEncodeError:
        # Fallback to ascii replacement
        print(text.encode("ascii", errors="replace").decode("ascii"))


def print_banner():
    banner = f"""
{Colors.GOLD}{Colors.BOLD}================================================================================
*  NumisManager - Numismatic Asset Management & 3D Digital Binder
================================================================================{Colors.RESET}"""
    safe_print(banner)


def get_platform_info():
    system = platform.system()  # Windows, Linux, Darwin
    machine = platform.machine().lower()  # x86_64, amd64, arm64, aarch64
    os_name = {
        "Windows": "Windows",
        "Linux": "Linux",
        "Darwin": "macOS"
    }.get(system, system)
    return system, machine, os_name


def check_python_version():
    if sys.version_info < MIN_PYTHON_VERSION:
        print(f"{Colors.RED}[ERROR] Python versi {sys.version_info.major}.{sys.version_info.minor} terdeteksi.{Colors.RESET}")
        print(f"{Colors.RED}NumisManager membutuhkan Python {MIN_PYTHON_VERSION[0]}.{MIN_PYTHON_VERSION[1]} atau lebih baru.{Colors.RESET}")
        sys.exit(1)


def get_venv_paths():
    system, _, _ = get_platform_info()
    venv_dir = ROOT_DIR / ".venv"
    if system == "Windows":
        python_bin = venv_dir / "Scripts" / "python.exe"
        pip_bin = venv_dir / "Scripts" / "pip.exe"
    else:
        python_bin = venv_dir / "bin" / "python"
        pip_bin = venv_dir / "bin" / "pip"
    return venv_dir, python_bin, pip_bin


def ensure_virtualenv():
    venv_dir, python_bin, pip_bin = get_venv_paths()
    if not venv_dir.exists() or not python_bin.exists():
        print(f"{Colors.CYAN}[SETUP] Virtual Environment (.venv) belum ada. Membuat otomatis...{Colors.RESET}")
        import venv
        venv.create(venv_dir, with_pip=True)
        print(f"{Colors.GREEN}[OK] Virtual Environment berhasil dibuat di: {venv_dir}{Colors.RESET}")
    return python_bin, pip_bin


def is_running_in_venv():
    # Detect if current process is inside the project's .venv
    venv_dir, _, _ = get_venv_paths()
    try:
        return Path(sys.prefix).resolve() == venv_dir.resolve()
    except Exception:
        return False


def get_requirements_path():
    req_root = ROOT_DIR / "requirements.txt"
    req_dep = ROOT_DIR / "dependencies" / "requirements.txt"
    if req_root.exists():
        return req_root
    elif req_dep.exists():
        return req_dep
    return req_root


def check_dependencies_installed():
    required_packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("jose", "python-jose"),
        ("passlib", "passlib"),
        ("multipart", "python-multipart"),
        ("openpyxl", "openpyxl"),
        ("aiofiles", "aiofiles")
    ]
    missing = []
    for module_name, pkg_name in required_packages:
        try:
            __import__(module_name)
        except ImportError:
            missing.append(pkg_name)
    return missing


def install_dependencies(pip_bin):
    req_path = get_requirements_path()
    if not req_path.exists():
        safe_print(f"{Colors.YELLOW}[WARN] Berkas requirements.txt tidak ditemukan di root maupun dependencies/.{Colors.RESET}")
        return

    wheels_dir = ROOT_DIR / "dependencies" / "wheels"
    if wheels_dir.exists() and any(wheels_dir.glob("*.whl")):
        safe_print(f"{Colors.CYAN}[DEPENDENCY] Menemukan offline wheels di {wheels_dir.name} ({len(list(wheels_dir.glob('*.whl')))} file). Menginstal secara offline tanpa internet...{Colors.RESET}")
        cmd = [str(pip_bin), "install", "--no-index", f"--find-links={wheels_dir}", "-r", str(req_path)]
        result = subprocess.run(cmd)
        if result.returncode == 0:
            safe_print(f"{Colors.GREEN}[OK] Seluruh dependensi Python berhasil diinstal secara offline.{Colors.RESET}")
            return
        safe_print(f"{Colors.YELLOW}[INFO] Beralih ke instalasi standar pip...{Colors.RESET}")

    safe_print(f"{Colors.CYAN}[DEPENDENCY] Menginstal/memperbarui paket dari {req_path.name}...{Colors.RESET}")
    cmd = [str(pip_bin), "install", "-r", str(req_path)]
    result = subprocess.run(cmd)
    if result.returncode != 0:
        safe_print(f"{Colors.RED}[ERROR] Gagal menginstal dependensi.{Colors.RESET}")
        sys.exit(result.returncode)
    safe_print(f"{Colors.GREEN}[OK] Seluruh dependensi Python siap digunakan.{Colors.RESET}")


def ensure_vendor_assets():
    # Ensure offline Chart.js is present in static/vendor/chartjs/
    vendor_dir = ROOT_DIR / "static" / "vendor" / "chartjs"
    vendor_file = vendor_dir / "chart.umd.min.js"
    if not vendor_file.exists():
        print(f"{Colors.CYAN}[ASSET] Mengunduh Chart.js offline ke static/vendor/chartjs/...{Colors.RESET}")
        vendor_dir.mkdir(parents=True, exist_ok=True)
        try:
            url = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
            urllib.request.urlretrieve(url, str(vendor_file))
            print(f"{Colors.GREEN}[OK] Chart.js offline berhasil diunduh ({vendor_file.stat().st_size // 1024} KB).{Colors.RESET}")
        except Exception as e:
            print(f"{Colors.YELLOW}[WARN] Tidak dapat mengunduh Chart.js offline: {e}. Aplikasi akan menggunakan CDN fallback.{Colors.RESET}")


def get_cloudflared_path():
    system, machine, _ = get_platform_info()
    tools_bin = ROOT_DIR / "tools" / "bin"
    tools_bin.mkdir(parents=True, exist_ok=True)

    if system == "Windows":
        candidates = [
            tools_bin / "cloudflared.exe",
            ROOT_DIR / "tools" / "cloudflared.exe",
            ROOT_DIR / "cloudflared.exe"
        ]
        for c in candidates:
            if c.exists():
                return c
        return tools_bin / "cloudflared.exe"
    else:
        # Linux / macOS
        target = tools_bin / "cloudflared"
        if target.exists():
            return target
        # Check system PATH
        which_path = shutil.which("cloudflared")
        if which_path:
            return Path(which_path)
        return target


def download_cloudflared(target_path):
    system, machine, _ = get_platform_info()
    print(f"{Colors.CYAN}[TOOLS] Binary cloudflared belum ditemukan. Mengunduh untuk {system} ({machine})...{Colors.RESET}")

    base_url = "https://github.com/cloudflare/cloudflared/releases/latest/download"
    if system == "Windows":
        url = f"{base_url}/cloudflared-windows-amd64.exe"
    elif system == "Darwin":
        # macOS
        if "arm" in machine:
            url = f"{base_url}/cloudflared-darwin-arm64.tgz"
        else:
            url = f"{base_url}/cloudflared-darwin-amd64.tgz"
    else:
        # Linux
        if "arm" in machine or "aarch64" in machine:
            url = f"{base_url}/cloudflared-linux-arm64"
        else:
            url = f"{base_url}/cloudflared-linux-amd64"

    try:
        print(f"{Colors.GRAY}Mengunduh dari: {url}{Colors.RESET}")
        urllib.request.urlretrieve(url, str(target_path))
        if system != "Windows":
            os.chmod(target_path, 0o755)
        print(f"{Colors.GREEN}[OK] cloudflared berhasil diunduh ke: {target_path}{Colors.RESET}")
        return True
    except Exception as e:
        print(f"{Colors.RED}[ERROR] Gagal mengunduh cloudflared: {e}{Colors.RESET}")
        print(f"{Colors.YELLOW}Silakan unduh manual dari https://github.com/cloudflare/cloudflared/releases dan simpan ke {target_path}{Colors.RESET}")
        return False


def run_diagnostics():
    system, machine, os_name = get_platform_info()
    print(f"\n{Colors.GOLD}--- Diagnostic & Health Check ---{Colors.RESET}")
    print(f"Sistem Operasi      : {os_name} ({platform.platform()})")
    print(f"Arsitektur CPU      : {machine}")
    print(f"Host Python         : {sys.executable} ({platform.python_version()})")

    venv_dir, venv_python, _ = get_venv_paths()
    print(f"Virtual Environment : {'[ADA] ' + str(venv_dir) if venv_dir.exists() else '[BELUM ADA]'}")
    print(f"Interpreter venv    : {'[ADA] ' + str(venv_python) if venv_python.exists() else '[BELUM ADA]'}")

    # Check packages
    missing = check_dependencies_installed()
    if missing:
        safe_print(f"Status Dependensi   : {Colors.YELLOW}[KURANG: {', '.join(missing)}]{Colors.RESET}")
    else:
        safe_print(f"Status Dependensi   : {Colors.GREEN}[LENGKAP - Semua paket terpasang]{Colors.RESET}")

    wheels_dir = ROOT_DIR / "dependencies" / "wheels"
    if wheels_dir.exists():
        whl_files = list(wheels_dir.glob("*.whl"))
        whl_size = sum(f.stat().st_size for f in whl_files) / (1024 * 1024)
        safe_print(f"Offline Wheels      : {Colors.GREEN}[ADA] {len(whl_files)} paket wheel ({whl_size:.1f} MB){Colors.RESET}")
    else:
        safe_print(f"Offline Wheels      : {Colors.GRAY}[TIDAK ADA]{Colors.RESET}")

    # Database
    db_path = ROOT_DIR / "database" / "numismatik.db"
    if db_path.exists():
        print(f"Database SQLite     : {Colors.GREEN}[ADA] {db_path} ({db_path.stat().st_size // 1024} KB){Colors.RESET}")
    else:
        print(f"Database SQLite     : {Colors.YELLOW}[BELUM DIBUAT - akan dibuat otomatis saat startup]{Colors.RESET}")

    # Tools
    cf_path = get_cloudflared_path()
    if cf_path.exists():
        print(f"Cloudflare Tunnel   : {Colors.GREEN}[ADA] {cf_path}{Colors.RESET}")
    else:
        print(f"Cloudflare Tunnel   : {Colors.YELLOW}[BELUM DIUNDUH - otomatis diunduh jika flag --tunnel aktif]{Colors.RESET}")

    # Vendor Assets
    chart_path = ROOT_DIR / "static" / "vendor" / "chartjs" / "chart.umd.min.js"
    if chart_path.exists():
        print(f"Chart.js Offline    : {Colors.GREEN}[ADA] {chart_path}{Colors.RESET}")
    else:
        print(f"Chart.js Offline    : {Colors.YELLOW}[BELUM ADA - otomatis diunduh saat startup]{Colors.RESET}")

    print(f"{Colors.GOLD}---------------------------------{Colors.RESET}\n")


def start_server_and_tunnel(port=8000, host="0.0.0.0", use_tunnel=False, reload=True):
    system, _, os_name = get_platform_info()
    processes = []

    def signal_handler(sig, frame):
        print(f"\n{Colors.YELLOW}[SHUTDOWN] Menghentikan seluruh proses...{Colors.RESET}")
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=3)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print(f"{Colors.GREEN}[OK] NumisManager telah dimatikan.{Colors.RESET}")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, signal_handler)

    # 1. Cloudflare Tunnel (if requested)
    if use_tunnel:
        cf_path = get_cloudflared_path()
        if not cf_path.exists():
            success = download_cloudflared(cf_path)
            if not success:
                print(f"{Colors.RED}[ERROR] Melanjutkan tanpa tunnel...{Colors.RESET}")
                use_tunnel = False

        if use_tunnel and cf_path.exists():
            print(f"{Colors.CYAN}[TUNNEL] Memulai Cloudflare Quick Tunnel ke port {port}...{Colors.RESET}")
            tunnel_cmd = [str(cf_path), "tunnel", "--url", f"http://localhost:{port}"]
            cf_proc = subprocess.Popen(
                tunnel_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace"
            )
            processes.append(cf_proc)

            # Background thread to capture and display the tunnel URL
            import threading
            def monitor_tunnel(proc):
                url_found = False
                for line in proc.stdout:
                    match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                    if match and not url_found:
                        tunnel_url = match.group(0)
                        url_found = True
                        safe_print(f"""
{Colors.GOLD}{Colors.BOLD}+------------------------------------------------------------------------+
| [TUNNEL] AKSES DARI PERANGKAT LUAR / HP (CLOUDFLARE QUICK TUNNEL)       |
+------------------------------------------------------------------------+
| Tautan Publik : {Colors.CYAN}{tunnel_url}/app{Colors.GOLD}
| Buka tautan di atas dari browser HP/Tablet Anda untuk mengakses.       |
+------------------------------------------------------------------------+{Colors.RESET}
""")

            t = threading.Thread(target=monitor_tunnel, args=(cf_proc,), daemon=True)
            t.start()

    # 2. Start Uvicorn Server
    safe_print(f"""
{Colors.GREEN}{Colors.BOLD}>>> NumisManager aktif di lingkungan {os_name}!{Colors.RESET}
   - {Colors.BOLD}Akses Lokal     :{Colors.RESET} {Colors.CYAN}http://localhost:{port}{Colors.RESET} atau {Colors.CYAN}http://127.0.0.1:{port}{Colors.RESET}
   - {Colors.BOLD}Akun Bawaan     :{Colors.RESET} admin / admin123
   - {Colors.BOLD}Tekan Ctrl + C  :{Colors.RESET} untuk mematikan server
""")

    # Launch uvicorn
    import uvicorn
    uvicorn.run("main:app", host=host, port=port, reload=reload)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="NumisManager Smart Cross-Platform Runner")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port server HTTP (default: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host binding (default: 0.0.0.0)")
    parser.add_argument("--tunnel", "-t", action="store_true", help="Aktifkan Cloudflare Quick Tunnel untuk akses internet/HP")
    parser.add_argument("--check", "-c", action="store_true", help="Jalankan pemeriksaan kesehatan lingkungan dan keluar")
    parser.add_argument("--install", "-i", action="store_true", help="Hanya instal dependensi dan keluar")
    parser.add_argument("--no-reload", action="store_true", help="Jalankan server tanpa fitur auto-reload")
    args = parser.parse_args()

    print_banner()
    system, machine, os_name = get_platform_info()
    print(f"{Colors.GRAY}[INFO] Sistem Operasi: {os_name} ({machine}) | Python: {platform.python_version()}{Colors.RESET}")

    check_python_version()

    # 1. Setup Virtual Environment
    venv_dir, venv_python, venv_pip = get_venv_paths()
    ensure_virtualenv()

    # 2. Self-Bootstrap Check: If not running under .venv, re-execute inside .venv
    if not is_running_in_venv():
        # First ensure dependencies are installed via venv pip
        missing = check_dependencies_installed()
        if missing or args.install:
            install_dependencies(venv_pip)

        ensure_vendor_assets()

        if args.install:
            print(f"{Colors.GREEN}[OK] Instalasi dependensi selesai.{Colors.RESET}")
            sys.exit(0)

        if args.check:
            # Re-run --check inside venv
            cmd = [str(venv_python), str(ROOT_DIR / "run.py"), "--check"]
            sys.exit(subprocess.run(cmd).returncode)

        # Re-launch current command inside .venv
        cmd = [str(venv_python), str(ROOT_DIR / "run.py")] + sys.argv[1:]
        sys.exit(subprocess.run(cmd).returncode)

    # Now we are GUARANTEED to be running inside .venv!
    missing = check_dependencies_installed()
    if missing:
        install_dependencies(venv_pip)

    ensure_vendor_assets()

    if args.install:
        print(f"{Colors.GREEN}[OK] Seluruh dependensi telah siap.{Colors.RESET}")
        sys.exit(0)

    if args.check:
        run_diagnostics()
        sys.exit(0)

    # Initialize DB if needed
    try:
        from database.db import init_db
        init_db()
    except Exception as e:
        print(f"{Colors.YELLOW}[WARN] Gagal auto-init database: {e}{Colors.RESET}")

    # Launch server and tunnel
    start_server_and_tunnel(
        port=args.port,
        host=args.host,
        use_tunnel=args.tunnel,
        reload=not args.no_reload
    )


if __name__ == "__main__":
    main()
