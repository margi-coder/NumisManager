import os
import sys
import io
import shutil
import zipfile
import tarfile
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
INSTALLER_DIR = ROOT_DIR / "Installer"
SMARTPHONE_DIR = INSTALLER_DIR / "smart_phone"
INSTALLER_DIR.mkdir(parents=True, exist_ok=True)
SMARTPHONE_DIR.mkdir(parents=True, exist_ok=True)

# 1. Patch templates/app.html with PWA manifest if not yet present
app_html_path = ROOT_DIR / "templates" / "app.html"
app_html_txt = app_html_path.read_text(encoding="utf-8")
if 'rel="manifest"' not in app_html_txt:
    app_html_txt = app_html_txt.replace(
        '<link rel="icon" type="image/png" href="/static/img/logo.png">',
        '<meta name="theme-color" content="#0a0c10">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <meta name="apple-mobile-web-app-title" content="NumisManager">\n  <link rel="icon" type="image/png" href="/static/img/logo.png">\n  <link rel="apple-touch-icon" href="/static/img/logo.png">\n  <link rel="manifest" href="/static/manifest.json">'
    )
    app_html_path.write_text(app_html_txt, encoding="utf-8")
    print("Updated templates/app.html with PWA manifest tags.")

# 2. Re-run build_ios_packages from build_mobile_and_pwa so standalone HTML & iOS mobileconfig use optimized 128x128 logo
import build_mobile_and_pwa
tmp_www = ROOT_DIR / "_tmp_ios_www"
build_mobile_and_pwa.prepare_mobile_www_bundle(tmp_www)
build_mobile_and_pwa.build_ios_packages(tmp_www)
if tmp_www.exists():
    shutil.rmtree(tmp_www, ignore_errors=True)


# ==============================================================================
# 3. COLLECT CLEAN APPLICATION FILES FOR DESKTOP INSTALLERS
# ==============================================================================
def copy_app_tree_to(staging_dir: Path):
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)

    # Top-level files
    top_files = [
        "main.py",
        "run.py",
        "run.bat",
        "run.sh",
        "requirements.txt",
        ".env.example",
        "README.md",
    ]
    for fn in top_files:
        src = ROOT_DIR / fn
        if src.exists():
            shutil.copy2(src, staging_dir / fn)

    # Add convenient Start-NumisManager.bat and Start-NumisManager-Tunnel.bat
    (staging_dir / "Start-NumisManager.bat").write_text(
        '@echo off\r\ncd /d "%~dp0"\r\nstart "" http://localhost:8000\r\ncall run.bat\r\n',
        encoding="utf-8"
    )
    (staging_dir / "Start-NumisManager-Tunnel.bat").write_text(
        '@echo off\r\ncd /d "%~dp0"\r\ncall run.bat --tunnel\r\n',
        encoding="utf-8"
    )

    # Copy routers, utils, templates, dependencies, tools
    for folder in ["routers", "utils", "templates", "dependencies", "tools"]:
        src_folder = ROOT_DIR / folder
        if src_folder.exists():
            shutil.copytree(
                src_folder,
                staging_dir / folder,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo")
            )

    # Copy database (schema.sql, db.py, __init__.py, without personal numismatik.db)
    db_staging = staging_dir / "database"
    db_staging.mkdir(parents=True, exist_ok=True)
    for fn in ["__init__.py", "db.py", "schema.sql"]:
        src = ROOT_DIR / "database" / fn
        if src.exists():
            shutil.copy2(src, db_staging / fn)

    # Copy static (excluding personal uploaded photos in static/uploads)
    shutil.copytree(
        ROOT_DIR / "static",
        staging_dir / "static",
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns("__pycache__")
    )
    uploads_dir = staging_dir / "static" / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    for f in uploads_dir.iterdir():
        if f.is_file() and f.name != ".gitkeep":
            f.unlink()
    (uploads_dir / ".gitkeep").write_text("", encoding="utf-8")


# ==============================================================================
# 4. BUILD WINDOWS SINGLE OFFLINE INSTALLER (.EXE)
#    Bundles Portable Python 3.14 + Pre-installed Site-Packages + Offline Wheels
#    + Offline Chart.js + NumisManager App into a single native .exe installer!
# ==============================================================================
def build_windows_single_offline_installer():
    print("\n--- Building Windows Single Offline Installer (.exe) ---")
    staging_win = ROOT_DIR / "_tmp_win_installer_staging"
    copy_app_tree_to(staging_win)

    # Bundle Portable Python runtime into staging_win / "runtime" / "python"
    py_base = Path(sys.base_prefix)
    print(f"Bundling Portable Python runtime from: {py_base}")
    rt_py = staging_win / "runtime" / "python"
    rt_py.mkdir(parents=True, exist_ok=True)

    # Copy root DLLs and EXEs from Python base
    for item in py_base.iterdir():
        if item.is_file() and item.suffix.lower() in (".exe", ".dll", ".pyd", ".cat", ".txt"):
            shutil.copy2(item, rt_py / item.name)

    # Copy DLLs folder (excluding Tcl/Tk heavy DLLs not needed for web server)
    if (py_base / "DLLs").exists():
        shutil.copytree(
            py_base / "DLLs",
            rt_py / "DLLs",
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns("tcl*", "tk*", "_tkinter*", "__pycache__")
        )

    # Copy standard library Lib (excluding test suites, idlelib, tkinter, turtledemo, ensurepip, site-packages)
    if (py_base / "Lib").exists():
        shutil.copytree(
            py_base / "Lib",
            rt_py / "Lib",
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(
                "site-packages", "test", "tests", "idlelib", "tkinter",
                "turtledemo", "ensurepip", "pydoc_data", "__pycache__", "*.pyc"
            )
        )

    # Copy pre-installed site-packages from .venv/Lib/site-packages into runtime/python/Lib/site-packages
    venv_sp = ROOT_DIR / ".venv" / "Lib" / "site-packages"
    target_sp = rt_py / "Lib" / "site-packages"
    target_sp.mkdir(parents=True, exist_ok=True)
    if venv_sp.exists():
        print(f"Bundling pre-installed packages from: {venv_sp}")
        shutil.copytree(
            venv_sp,
            target_sp,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns("pip", "pip-*", "__pycache__", "*.pyc", "*.pyo")
        )

    # Create ZIP payload of staging_win
    payload_zip = ROOT_DIR / "_tmp_win_payload.zip"
    if payload_zip.exists():
        payload_zip.unlink()

    print("Compressing Windows offline bundle into ZIP payload...")
    with zipfile.ZipFile(payload_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for file_path in staging_win.rglob("*"):
            if file_path.is_file():
                rel_path = file_path.relative_to(staging_win).as_posix()
                zf.write(file_path, rel_path)

    payload_mb = payload_zip.stat().st_size / (1024 * 1024)
    print(f"Windows ZIP payload size: {payload_mb:.2f} MB")

    # Compile C# Native Self-Extracting GUI + CLI Installer Stub
    cs_code = r"""
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Drawing;
using System.Windows.Forms;

namespace NumisInstaller
{
    public class InstallerForm : Form
    {
        private TextBox txtInstallDir;
        private Button btnBrowse;
        private Button btnInstall;
        private Button btnCancel;
        private ProgressBar progressBar;
        private Label lblStatus;
        private CheckBox chkShortcut;
        private CheckBox chkLaunchNow;

        public InstallerForm()
        {
            this.Text = "NumisManager v1.0 - Single Offline Installer (Windows 64-bit)";
            this.Size = new Size(560, 390);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(14, 17, 24);
            this.ForeColor = Color.FromArgb(240, 237, 230);
            this.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            Label lblTitle = new Label();
            lblTitle.Text = "🪙 NumisManager - Single Offline Installer";
            lblTitle.Font = new Font("Segoe UI", 15F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(212, 175, 55);
            lblTitle.Location = new Point(24, 20);
            lblTitle.Size = new Size(500, 32);
            this.Controls.Add(lblTitle);

            Label lblSub = new Label();
            lblSub.Text = "Paket instalasi mandiri 100% Offline (Termasuk Portable Python 3.14, seluruh pustaka FastAPI/Uvicorn/Cryptography, Offline Wheels, Chart.js, dan Database SQLite). Tidak memerlukan koneksi internet.";
            lblSub.ForeColor = Color.FromArgb(165, 160, 155);
            lblSub.Location = new Point(26, 56);
            lblSub.Size = new Size(495, 42);
            this.Controls.Add(lblSub);

            Label lblDir = new Label();
            lblDir.Text = "Lokasi Folder Instalasi:";
            lblDir.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblDir.Location = new Point(26, 110);
            lblDir.Size = new Size(300, 20);
            this.Controls.Add(lblDir);

            string defaultDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NumisManager");
            txtInstallDir = new TextBox();
            txtInstallDir.Text = defaultDir;
            txtInstallDir.BackColor = Color.FromArgb(24, 28, 40);
            txtInstallDir.ForeColor = Color.White;
            txtInstallDir.BorderStyle = BorderStyle.FixedSingle;
            txtInstallDir.Location = new Point(26, 134);
            txtInstallDir.Size = new Size(395, 26);
            this.Controls.Add(txtInstallDir);

            btnBrowse = new Button();
            btnBrowse.Text = "Pilih...";
            btnBrowse.FlatStyle = FlatStyle.Flat;
            btnBrowse.BackColor = Color.FromArgb(34, 39, 58);
            btnBrowse.ForeColor = Color.FromArgb(212, 175, 55);
            btnBrowse.Location = new Point(430, 132);
            btnBrowse.Size = new Size(90, 28);
            btnBrowse.Click += BtnBrowse_Click;
            this.Controls.Add(btnBrowse);

            chkShortcut = new CheckBox();
            chkShortcut.Text = "Buat Pintasan (Shortcut) NumisManager di Desktop";
            chkShortcut.Checked = true;
            chkShortcut.Location = new Point(26, 174);
            chkShortcut.Size = new Size(450, 24);
            this.Controls.Add(chkShortcut);

            chkLaunchNow = new CheckBox();
            chkLaunchNow.Text = "Jalankan Server NumisManager setelah instalasi selesai";
            chkLaunchNow.Checked = true;
            chkLaunchNow.Location = new Point(26, 202);
            chkLaunchNow.Size = new Size(450, 24);
            this.Controls.Add(chkLaunchNow);

            lblStatus = new Label();
            lblStatus.Text = "Siap menginstal secara offline.";
            lblStatus.ForeColor = Color.FromArgb(212, 175, 55);
            lblStatus.Location = new Point(26, 240);
            lblStatus.Size = new Size(495, 22);
            this.Controls.Add(lblStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(26, 265);
            progressBar.Size = new Size(494, 22);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            btnInstall = new Button();
            btnInstall.Text = "Instal Sekarang (Offline)";
            btnInstall.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.BackColor = Color.FromArgb(212, 175, 55);
            btnInstall.ForeColor = Color.FromArgb(10, 12, 16);
            btnInstall.Location = new Point(220, 305);
            btnInstall.Size = new Size(195, 36);
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);

            btnCancel = new Button();
            btnCancel.Text = "Tutup";
            btnCancel.FlatStyle = FlatStyle.Flat;
            btnCancel.BackColor = Color.FromArgb(34, 39, 58);
            btnCancel.ForeColor = Color.White;
            btnCancel.Location = new Point(425, 305);
            btnCancel.Size = new Size(95, 36);
            btnCancel.Click += (s, e) => this.Close();
            this.Controls.Add(btnCancel);
        }

        private void BtnBrowse_Click(object sender, EventArgs e)
        {
            using (FolderBrowserDialog fbd = new FolderBrowserDialog())
            {
                fbd.SelectedPath = txtInstallDir.Text;
                if (fbd.ShowDialog() == DialogResult.OK)
                {
                    txtInstallDir.Text = Path.Combine(fbd.SelectedPath, "NumisManager");
                }
            }
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            string targetDir = txtInstallDir.Text.Trim();
            if (string.IsNullOrEmpty(targetDir)) return;

            btnInstall.Enabled = false;
            btnBrowse.Enabled = false;
            txtInstallDir.Enabled = false;
            bool makeShortcut = chkShortcut.Checked;
            bool launchNow = chkLaunchNow.Checked;

            Thread worker = new Thread(() =>
            {
                try
                {
                    Program.ExtractEmbeddedPayload(targetDir, (pct, msg) =>
                    {
                        this.Invoke((MethodInvoker)delegate
                        {
                            progressBar.Value = Math.Min(100, Math.Max(0, pct));
                            lblStatus.Text = msg;
                        });
                    });

                    if (makeShortcut)
                    {
                        Program.CreateDesktopShortcut(targetDir);
                    }

                    this.Invoke((MethodInvoker)delegate
                    {
                        progressBar.Value = 100;
                        lblStatus.Text = "Instalasi Selesai 100%! NumisManager siap digunakan.";
                        MessageBox.Show(
                            "NumisManager berhasil diinstal secara offline di:\n" + targetDir + "\n\nAkun Login Bawaan: admin / admin123",
                            "Instalasi Berhasil",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information
                        );
                        if (launchNow)
                        {
                            string batPath = Path.Combine(targetDir, "Start-NumisManager.bat");
                            if (File.Exists(batPath))
                            {
                                ProcessStartInfo psi = new ProcessStartInfo(batPath);
                                psi.WorkingDirectory = targetDir;
                                psi.UseShellExecute = true;
                                Process.Start(psi);
                            }
                        }
                        this.Close();
                    });
                }
                catch (Exception ex)
                {
                    this.Invoke((MethodInvoker)delegate
                    {
                        lblStatus.Text = "Gagal: " + ex.Message;
                        btnInstall.Enabled = true;
                        btnBrowse.Enabled = true;
                        txtInstallDir.Enabled = true;
                        MessageBox.Show("Terjadi kesalahan saat instalasi:\n" + ex.ToString(), "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    });
                }
            });
            worker.IsBackground = true;
            worker.Start();
        }
    }

    static class Program
    {
        // Magic trailer at the very end of the EXE: 8-byte int64 payload length + 8-byte magic "NUMISZIP"
        private static readonly byte[] MAGIC = System.Text.Encoding.ASCII.GetBytes("NUMISZIP");

        public static void ExtractEmbeddedPayload(string targetDir, Action<int, string> onProgress)
        {
            string exePath = Process.GetCurrentProcess().MainModule.FileName;
            using (FileStream fs = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                if (fs.Length < 16)
                    throw new Exception("Berkas installer tidak valid.");

                fs.Seek(-16, SeekOrigin.End);
                byte[] trailer = new byte[16];
                fs.Read(trailer, 0, 16);

                for (int i = 0; i < 8; i++)
                {
                    if (trailer[8 + i] != MAGIC[i])
                        throw new Exception("Payload offline tidak ditemukan di dalam berkas EXE.");
                }

                long zipLength = BitConverter.ToInt64(trailer, 0);
                long zipOffset = fs.Length - 16 - zipLength;
                fs.Seek(zipOffset, SeekOrigin.Begin);

                if (!Directory.Exists(targetDir))
                    Directory.CreateDirectory(targetDir);

                // Stream slice via SubStream or temp zip
                string tempZip = Path.Combine(Path.GetTempPath(), "numis_offline_payload_" + Guid.NewGuid().ToString("N") + ".zip");
                try
                {
                    onProgress(5, "Menyiapkan arsip offline NumisManager...");
                    using (FileStream outZip = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                    {
                        byte[] buf = new byte[65536];
                        long remaining = zipLength;
                        while (remaining > 0)
                        {
                            int toRead = (int)Math.Min(buf.Length, remaining);
                            int read = fs.Read(buf, 0, toRead);
                            if (read <= 0) break;
                            outZip.Write(buf, 0, read);
                            remaining -= read;
                        }
                    }

                    using (ZipArchive archive = ZipFile.OpenRead(tempZip))
                    {
                        int total = archive.Entries.Count;
                        int current = 0;
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            current++;
                            string fullPath = Path.Combine(targetDir, entry.FullName.Replace('/', Path.DirectorySeparatorChar));
                            string dirName = Path.GetDirectoryName(fullPath);
                            if (!string.IsNullOrEmpty(dirName) && !Directory.Exists(dirName))
                            {
                                Directory.CreateDirectory(dirName);
                            }
                            if (!string.IsNullOrEmpty(entry.Name))
                            {
                                entry.ExtractToFile(fullPath, true);
                            }
                            if (current % 25 == 0 || current == total)
                            {
                                int pct = 10 + (int)((current * 90.0) / Math.Max(1, total));
                                onProgress(pct, "Mengekstrak (" + current + "/" + total + "): " + entry.Name);
                            }
                        }
                    }
                }
                finally
                {
                    if (File.Exists(tempZip))
                    {
                        try { File.Delete(tempZip); } catch { }
                    }
                }
            }
        }

        public static void CreateDesktopShortcut(string targetDir)
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutLocation = Path.Combine(desktop, "NumisManager.lnk");
                string vbs = Path.Combine(Path.GetTempPath(), "create_numis_shortcut.vbs");
                string batPath = Path.Combine(targetDir, "Start-NumisManager.bat");
                string lines = "Set oWS = WScript.CreateObject(\"WScript.Shell\")\r\n" +
                               "Set oLink = oWS.CreateShortcut(\"" + shortcutLocation + "\")\r\n" +
                               "oLink.TargetPath = \"" + batPath + "\"\r\n" +
                               "oLink.WorkingDirectory = \"" + targetDir + "\"\r\n" +
                               "oLink.Description = \"NumisManager - Numismatic Asset Management\"\r\n" +
                               "oLink.Save\r\n";
                File.WriteAllText(vbs, lines);
                ProcessStartInfo psi = new ProcessStartInfo("wscript.exe", "\"" + vbs + "\"");
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process p = Process.Start(psi);
                p.WaitForExit(3000);
                try { File.Delete(vbs); } catch { }
            }
            catch { }
        }

        [STAThread]
        static int Main(string[] args)
        {
            bool silent = false;
            string customDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NumisManager");
            foreach (string arg in args)
            {
                if (arg == "--silent" || arg == "/S" || arg == "/silent")
                    silent = true;
                else if (arg.StartsWith("--dir="))
                    customDir = arg.Substring("--dir=".Length).Trim('"');
            }

            if (silent)
            {
                try
                {
                    ExtractEmbeddedPayload(customDir, (pct, msg) => { });
                    CreateDesktopShortcut(customDir);
                    return 0;
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine(ex.ToString());
                    return 1;
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
            return 0;
        }
    }
}
"""
    cs_path = ROOT_DIR / "_tmp_installer_stub.cs"
    stub_exe = ROOT_DIR / "_tmp_installer_stub.exe"
    cs_path.write_text(cs_code, encoding="utf-8")

    csc_path = Path(r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe")
    subprocess.run([
        str(csc_path),
        "/nologo",
        "/target:winexe",
        "/optimize+",
        f"/out:{stub_exe}",
        "/r:System.dll",
        "/r:System.Drawing.dll",
        "/r:System.Windows.Forms.dll",
        "/r:System.IO.Compression.dll",
        "/r:System.IO.Compression.FileSystem.dll",
        str(cs_path)
    ], check=True)

    # Combine stub_exe + payload_zip + 8-byte int64 zipLength + 8-byte "NUMISZIP" into final single .exe
    final_win_exe = INSTALLER_DIR / "NumisManager-Single-Offline-Installer-Windows.exe"
    import struct
    zip_size = payload_zip.stat().st_size
    with open(final_win_exe, "wb") as out_f:
        with open(stub_exe, "rb") as stub_f:
            shutil.copyfileobj(stub_f, out_f)
        with open(payload_zip, "rb") as zip_f:
            shutil.copyfileobj(zip_f, out_f)
        out_f.write(struct.pack("<q", zip_size))
        out_f.write(b"NUMISZIP")

    print(f"Created Windows Single Offline Installer: {final_win_exe} ({final_win_exe.stat().st_size / (1024*1024):.2f} MB)")

    # Clean up temporary files
    for p in [cs_path, stub_exe, payload_zip]:
        if p.exists():
            p.unlink()
    if staging_win.exists():
        shutil.rmtree(staging_win, ignore_errors=True)


# ==============================================================================
# 5. BUILD LINUX & macOS SINGLE OFFLINE INSTALLER (.RUN)
#    Self-extracting POSIX shell installer containing the full app + all 60
#    offline wheels + offline Chart.js + desktop launchers for Linux & macOS!
# ==============================================================================
def build_linux_macos_single_offline_installer():
    print("\n--- Building Linux & macOS Single Offline Installer (.run) ---")
    staging_unix = ROOT_DIR / "_tmp_unix_installer_staging"
    copy_app_tree_to(staging_unix)

    # Ensure run.sh has LF line endings
    run_sh = staging_unix / "run.sh"
    if run_sh.exists():
        run_sh.write_bytes(run_sh.read_bytes().replace(b"\r\n", b"\n"))

    # Add macOS double-click launcher Start-NumisManager.command
    mac_cmd = staging_unix / "Start-NumisManager.command"
    mac_cmd.write_bytes(
        b"#!/usr/bin/env bash\n"
        b"cd \"$(dirname \"$0\")\"\n"
        b"(sleep 2 && open http://localhost:8000) &\n"
        b"bash ./run.sh\n"
    )

    # Create tar.gz in memory / temp file
    tar_gz_path = ROOT_DIR / "_tmp_unix_payload.tar.gz"
    if tar_gz_path.exists():
        tar_gz_path.unlink()

    with tarfile.open(tar_gz_path, "w:gz") as tf:
        for file_path in staging_unix.rglob("*"):
            rel_path = file_path.relative_to(staging_unix).as_posix()
            info = tf.gettarinfo(str(file_path), arcname=rel_path)
            if rel_path.endswith(".sh") or rel_path.endswith(".command") or rel_path == "run.py":
                info.mode = 0o755
            if file_path.is_file():
                with open(file_path, "rb") as f:
                    tf.addfile(info, f)
            else:
                tf.addfile(info)

    shell_header = """#!/usr/bin/env sh
# ==============================================================================
# 🪙 NumisManager v1.0 - Single Offline Installer for Linux & macOS
# ==============================================================================
# Paket instalasi tunggal 100% Offline (Berisi kode sumber lengkap, Chart.js
# lokal, dan 60 paket Python Wheel offline untuk Linux & macOS).
#
# Penggunaan:
#   chmod +x NumisManager-Single-Offline-Installer-Linux-macOS.run
#   ./NumisManager-Single-Offline-Installer-Linux-macOS.run
# ==============================================================================
set -e

TARGET_DIR="$HOME/NumisManager"
AUTO_START=0

for arg in "$@"; do
    case "$arg" in
        --dir=*)
            TARGET_DIR="${arg#*=}"
            ;;
        --start)
            AUTO_START=1
            ;;
    esac
done

echo "=============================================================================="
echo "🪙  NumisManager v1.0 - Single Offline Installer (Linux & macOS)"
echo "=============================================================================="
echo "[INFO] Folder tujuan instalasi: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

echo "[1/3] Mengekstrak paket aplikasi & offline wheels..."
ARCHIVE_LINE=$(awk '/^__NUMIS_ARCHIVE_BELOW__/ {print NR + 1; exit 0; }' "$0")
tail -n +"$ARCHIVE_LINE" "$0" | tar -xz -C "$TARGET_DIR"

chmod +x "$TARGET_DIR/run.sh" "$TARGET_DIR/run.py" "$TARGET_DIR/Start-NumisManager.command" 2>/dev/null || true

echo "[2/3] Menyiapkan Virtual Environment & menginstal paket secara OFFLINE..."
cd "$TARGET_DIR"
if command -v python3 >/dev/null 2>&1; then
    PY_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PY_CMD="python"
else
    echo "[WARN] Python 3 belum ditemukan di PATH. File telah diekstrak ke $TARGET_DIR."
    exit 0
fi

"$PY_CMD" run.py --install

echo "[3/3] Membuat pintasan aplikasi (Desktop Launcher)..."
if [ "$(uname -s)" = "Linux" ]; then
    DESKTOP_DIR="$HOME/.local/share/applications"
    mkdir -p "$DESKTOP_DIR"
    cat > "$DESKTOP_DIR/numismanager.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=NumisManager
Comment=Numismatic Asset Management & 3D Digital Binder
Exec=$TARGET_DIR/run.sh
Icon=$TARGET_DIR/static/img/logo.png
Terminal=true
Categories=Office;Finance;
EOF
    chmod +x "$DESKTOP_DIR/numismanager.desktop" 2>/dev/null || true
fi

echo "=============================================================================="
echo "✅ INSTALASI OFFLINE BERHASIL!"
echo "   Lokasi Instalasi : $TARGET_DIR"
echo "   Cara Menjalankan : cd \"$TARGET_DIR\" && ./run.sh"
echo "   Alamat Web Lokal : http://localhost:8000 (Login: admin / admin123)"
echo "=============================================================================="

if [ "$AUTO_START" = "1" ]; then
    exec ./run.sh
fi
exit 0
__NUMIS_ARCHIVE_BELOW__
"""
    final_run_path = INSTALLER_DIR / "NumisManager-Single-Offline-Installer-Linux-macOS.run"
    with open(final_run_path, "wb") as out_f:
        out_f.write(shell_header.encode("utf-8"))
        with open(tar_gz_path, "rb") as tf_in:
            shutil.copyfileobj(tf_in, out_f)

    print(f"Created Linux & macOS Single Offline Installer: {final_run_path} ({final_run_path.stat().st_size / (1024*1024):.2f} MB)")

    if tar_gz_path.exists():
        tar_gz_path.unlink()
    if staging_unix.exists():
        shutil.rmtree(staging_unix, ignore_errors=True)


if __name__ == "__main__":
    build_windows_single_offline_installer()
    build_linux_macos_single_offline_installer()
    print("\nALL DESKTOP INSTALLERS BUILT SUCCESSFULLY!")
