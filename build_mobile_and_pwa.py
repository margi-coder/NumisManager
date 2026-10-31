import os
import sys
import json
import uuid
import base64
import shutil
import zipfile
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
INSTALLER_DIR = ROOT_DIR / "Installer"
SMARTPHONE_DIR = INSTALLER_DIR / "smart_phone"
INSTALLER_DIR.mkdir(parents=True, exist_ok=True)
SMARTPHONE_DIR.mkdir(parents=True, exist_ok=True)

# ==============================================================================
# 2. PREPARE PORTABLE MOBILE WEB ASSETS (FOR ANDROID APK & iOS)
#    Adjusts absolute '/static/...' and '/app' links to work seamlessly from
#    file:///android_asset/www/ (Android APK) and iOS WebClip / Local Bundle
# ==============================================================================
def prepare_mobile_www_bundle(target_www_dir: Path):
    if target_www_dir.exists():
        shutil.rmtree(target_www_dir)
    target_www_dir.mkdir(parents=True, exist_ok=True)

    # Copy static folder (excluding uploaded user photos in static/uploads)
    shutil.copytree(ROOT_DIR / "static", target_www_dir / "static", dirs_exist_ok=True)
    uploads_dir = target_www_dir / "static" / "uploads"
    if uploads_dir.exists():
        for f in uploads_dir.iterdir():
            if f.is_file() and f.name != ".gitkeep":
                try:
                    f.unlink()
                except Exception:
                    pass

    # Read and transform login.html -> index.html
    login_html = (ROOT_DIR / "templates" / "login.html").read_text(encoding="utf-8")
    login_html = login_html.replace('href="/static/', 'href="static/')
    login_html = login_html.replace('src="/static/', 'src="static/')
    login_html = login_html.replace("window.location.href = '/app';", "window.location.href = 'app.html';")
    login_html = login_html.replace('</head>', '  <script src="static/js/mobile_offline_engine.js"></script>\n</head>')
    (target_www_dir / "index.html").write_text(login_html, encoding="utf-8")

    # Read and transform app.html -> app.html
    app_html = (ROOT_DIR / "templates" / "app.html").read_text(encoding="utf-8")
    app_html = app_html.replace('href="/static/', 'href="static/')
    app_html = app_html.replace('src="/static/', 'src="static/')
    app_html = app_html.replace("window.location.href = '/';", "window.location.href = 'index.html';")
    app_html = app_html.replace('<!-- Application Scripts -->', '<!-- Application Scripts -->\n  <script src="static/js/mobile_offline_engine.js"></script>')
    (target_www_dir / "app.html").write_text(app_html, encoding="utf-8")

    # Also patch auth.js and api.js inside target_www_dir/static/js so logout redirects to index.html and default logo works
    for js_file in (target_www_dir / "static" / "js").glob("*.js"):
        txt = js_file.read_text(encoding="utf-8")
        txt = txt.replace("window.location.href = '/';", "window.location.href = (window.location.protocol === 'file:' ? 'index.html' : '/');")
        txt = txt.replace("window.location.href = '/app';", "window.location.href = (window.location.protocol === 'file:' ? 'app.html' : '/app');")
        txt = txt.replace("'/static/img/logo.png'", "'static/img/logo.png'")
        txt = txt.replace('"/static/img/logo.png"', '"static/img/logo.png"')
        js_file.write_text(txt, encoding="utf-8")


# ==============================================================================
# 3. BUILD SIGNED ANDROID APK: Installer/smart_phone/NumisManager-Android-v1.0.0.apk
# ==============================================================================
def build_android_apk():
    # Ensure JAVA_HOME does not end with \bin so d8.bat and apksigner.bat work properly
    java_home = os.environ.get("JAVA_HOME", r"C:\Program Files\Java\jdk-26.0.1")
    if java_home.lower().endswith("\\bin") or java_home.lower().endswith("/bin"):
        java_home = str(Path(java_home).parent)
    os.environ["JAVA_HOME"] = java_home

    sdk_dir = Path(os.environ.get("LOCALAPPDATA", "")) / "Android" / "Sdk"
    build_tools = sdk_dir / "build-tools" / "36.1.0"
    if not build_tools.exists():
        # fallback to any available build-tools
        bt_list = sorted((sdk_dir / "build-tools").glob("*"), reverse=True)
        build_tools = bt_list[0]
    platform_jar = sdk_dir / "platforms" / "android-36.1" / "android.jar"
    if not platform_jar.exists():
        pf_list = sorted((sdk_dir / "platforms").glob("*/android.jar"), reverse=True)
        platform_jar = pf_list[0]

    aapt2 = build_tools / "aapt2.exe"
    d8_bat = build_tools / "d8.bat"
    zipalign = build_tools / "zipalign.exe"
    apksigner_bat = build_tools / "apksigner.bat"

    tmp_dir = ROOT_DIR / "_tmp_apk_build"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. AndroidManifest.xml
        manifest_xml = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="id.numismanager.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="35" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""
        manifest_path = tmp_dir / "AndroidManifest.xml"
        manifest_path.write_text(manifest_xml, encoding="utf-8")

        # 2. Resources (icon + strings)
        res_dir = tmp_dir / "res"
        (res_dir / "mipmap-xxxhdpi").mkdir(parents=True, exist_ok=True)
        (res_dir / "values").mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT_DIR / "static" / "img" / "logo.png", res_dir / "mipmap-xxxhdpi" / "ic_launcher.png")
        (res_dir / "values" / "strings.xml").write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">NumisManager</string>\n</resources>\n',
            encoding="utf-8"
        )

        # 3. Compile & Link resources with aapt2
        compiled_res = tmp_dir / "compiled_res.zip"
        unaligned_apk = tmp_dir / "unaligned.apk"
        gen_dir = tmp_dir / "gen"
        gen_dir.mkdir(parents=True, exist_ok=True)

        subprocess.run([str(aapt2), "compile", "--dir", str(res_dir), "-o", str(compiled_res)], check=True)
        subprocess.run([
            str(aapt2), "link",
            "-o", str(unaligned_apk),
            "-I", str(platform_jar),
            "--manifest", str(manifest_path),
            "--java", str(gen_dir),
            str(compiled_res)
        ], check=True)

        # 4. Write MainActivity.java
        src_pkg = tmp_dir / "src" / "id" / "numismanager" / "app"
        src_pkg.mkdir(parents=True, exist_ok=True)
        main_activity_java = """package id.numismanager.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0a0c10"));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {}
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

                try {
                    startActivityForResult(Intent.createChooser(intent, "Pilih Foto Koleksi"), FILE_CHOOSER_RESULT_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{ data.getData() };
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
"""
        main_java_path = src_pkg / "MainActivity.java"
        main_java_path.write_text(main_activity_java, encoding="utf-8")

        # 5. Compile Java -> .class -> classes.dex
        classes_dir = tmp_dir / "classes"
        classes_dir.mkdir(parents=True, exist_ok=True)
        r_java_path = gen_dir / "id" / "numismanager" / "app" / "R.java"

        subprocess.run([
            "javac",
            "--release", "11",
            "-cp", str(platform_jar),
            "-d", str(classes_dir),
            str(r_java_path),
            str(main_java_path)
        ], check=True)

        class_files = [str(p) for p in classes_dir.rglob("*.class")]
        subprocess.run([
            str(d8_bat),
            "--lib", str(platform_jar),
            "--min-api", "21",
            "--output", str(tmp_dir),
            *class_files
        ], check=True)

        # 6. Prepare assets/www and bundle classes.dex + assets/www into unaligned.apk
        assets_www = tmp_dir / "assets" / "www"
        prepare_mobile_www_bundle(assets_www)

        with zipfile.ZipFile(unaligned_apk, "a", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.write(tmp_dir / "classes.dex", "classes.dex")
            for f in (tmp_dir / "assets").rglob("*"):
                if f.is_file():
                    rel = f.relative_to(tmp_dir).as_posix()
                    # Do not add user uploaded photos from PC database to keep APK lightweight
                    if "static/uploads/" in rel and not rel.endswith(".gitkeep"):
                        continue
                    zf.write(f, rel)

        # 7. Zipalign & Sign APK
        aligned_apk = tmp_dir / "aligned.apk"
        subprocess.run([str(zipalign), "-f", "-p", "4", str(unaligned_apk), str(aligned_apk)], check=True)

        keystore_path = tmp_dir / "numis_release.keystore"
        subprocess.run([
            "keytool", "-genkeypair",
            "-v",
            "-keystore", str(keystore_path),
            "-storepass", "numis123",
            "-keypass", "numis123",
            "-alias", "numiskey",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-dname", "CN=NumisManager, OU=NumismaticSuite, O=NumisManager, L=Jakarta, S=DKI, C=ID"
        ], check=True)

        final_apk = SMARTPHONE_DIR / "NumisManager-Android-v1.0.0.apk"
        subprocess.run([
            str(apksigner_bat), "sign",
            "--ks", str(keystore_path),
            "--ks-pass", "pass:numis123",
            "--key-pass", "pass:numis123",
            "--out", str(final_apk),
            str(aligned_apk)
        ], check=True)

        print(f"Successfully built signed Android APK: {final_apk} ({final_apk.stat().st_size / 1024:.1f} KB)")
        return assets_www
    finally:
        pass


# ==============================================================================
# 4. BUILD iOS PACKAGES (.mobileconfig, .ipa, & Standalone Single-File App)
# ==============================================================================
def build_ios_packages(assets_www: Path):
    # 4A. Build Single-File Standalone Offline HTML for iOS & Android
    try:
        from PIL import Image
        import io
        im = Image.open(ROOT_DIR / "static" / "img" / "logo.png")
        im.thumbnail((128, 128))
        buf = io.BytesIO()
        im.save(buf, format="PNG", optimize=True)
        logo_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        logo_b64 = base64.b64encode((ROOT_DIR / "static" / "img" / "logo.png").read_bytes()).decode("ascii")
    logo_data_uri = f"data:image/png;base64,{logo_b64}"

    css_all = "\n".join([
        (ROOT_DIR / "static" / "css" / "style.css").read_text(encoding="utf-8"),
        (ROOT_DIR / "static" / "css" / "components.css").read_text(encoding="utf-8"),
        (ROOT_DIR / "static" / "css" / "album.css").read_text(encoding="utf-8"),
    ])

    js_files_order = [
        "mobile_offline_engine.js",
        "api.js",
        "auth.js",
        "dashboard.js",
        "pembelian.js",
        "koleksi.js",
        "penjualan.js",
        "supplier.js",
        "manajemen_data.js",
        "laporan.js",
        "album.js",
        "backup.js"
    ]
    chart_js = (ROOT_DIR / "static" / "vendor" / "chartjs" / "chart.umd.min.js").read_text(encoding="utf-8")
    all_app_js = "\n;\n".join([
        (ROOT_DIR / "static" / "js" / fn).read_text(encoding="utf-8")
        for fn in js_files_order
    ])
    all_app_js = all_app_js.replace("/static/img/logo.png", logo_data_uri)

    # Extract body innerHTML of app.html (up to <!-- Application Scripts -->)
    app_raw = (ROOT_DIR / "templates" / "app.html").read_text(encoding="utf-8")
    body_start = app_raw.find("<body>") + len("<body>")
    scripts_marker = app_raw.find("<!-- Application Scripts -->")
    app_body_markup = app_raw[body_start:scripts_marker].replace("/static/img/logo.png", logo_data_uri)

    router_start = app_raw.find("<!-- Router & Initializer -->")
    router_end = app_raw.rfind("</body>")
    router_script_block = app_raw[router_start:router_end]

    standalone_html = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="NumisManager">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#0a0c10">
  <title>NumisManager Mobile (Android &amp; iOS)</title>
  <link rel="icon" type="image/png" href="{logo_data_uri}">
  <link rel="apple-touch-icon" href="{logo_data_uri}">
  <style>
{css_all}
  </style>
  <script>
    window.__NUMIS_STANDALONE_MOBILE__ = true;
    // Auto-authenticate default mobile session if not logged in yet
    if (!localStorage.getItem('numis_token')) {{
      localStorage.setItem('numis_token', 'mobile-offline-token-1');
      localStorage.setItem('numis_user', JSON.stringify({{ id: 1, username: 'admin', nama_lengkap: 'Administrator Mobile', role: 'admin' }}));
    }}
  </script>
</head>
<body>
{app_body_markup}
  <script>
{chart_js}
  </script>
  <script>
{all_app_js}
  </script>
  {router_script_block}
</body>
</html>
"""
    standalone_path = SMARTPHONE_DIR / "NumisManager-Mobile-Offline-Standalone.html"
    standalone_path.write_text(standalone_html, encoding="utf-8")
    print(f"Created Universal Standalone Mobile HTML: {standalone_path} ({standalone_path.stat().st_size / 1024:.1f} KB)")

    # 4B. Build iOS .mobileconfig WebClip Installer Profile
    # Embeds the standalone HTML as a data URL or local launcher so installing the profile on iPhone/iPad creates a Fullscreen Home Screen App!
    standalone_b64 = base64.b64encode(standalone_html.encode("utf-8")).decode("ascii")
    standalone_data_url = f"data:text/html;base64,{standalone_b64}"

    mobileconfig_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>Icon</key>
            <data>{logo_b64}</data>
            <key>IgnoreManifestScope</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>NumisManager</string>
            <key>PayloadDescription</key>
            <string>Instal Aplikasi NumisManager ke Layar Utama iOS (iPhone / iPad)</string>
            <key>PayloadDisplayName</key>
            <string>NumisManager WebClip</string>
            <key>PayloadIdentifier</key>
            <string>id.numismanager.ios.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>{str(uuid.uuid4()).upper()}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>{standalone_data_url}</string>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Paket Instalasi Aplikasi NumisManager (Numismatic Asset &amp; Inventory Suite) untuk iOS / iPadOS. Berjalan 100% Offline maupun terhubung ke Server PC.</string>
    <key>PayloadDisplayName</key>
    <string>NumisManager (iOS App Installer)</string>
    <key>PayloadIdentifier</key>
    <string>id.numismanager.ios.profile</string>
    <key>PayloadOrganization</key>
    <string>NumisManager Suite</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>{str(uuid.uuid4()).upper()}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
"""
    mobileconfig_path = SMARTPHONE_DIR / "NumisManager-iOS-v1.0.0.mobileconfig"
    mobileconfig_path.write_text(mobileconfig_xml, encoding="utf-8")
    print(f"Created iOS Configuration Profile Installer: {mobileconfig_path} ({mobileconfig_path.stat().st_size / 1024:.1f} KB)")

    # 4C. Build iOS .ipa Archive (Payload/NumisManager.app) for iOS Sideloading (AltStore / Sideloadly / TrollStore)
    ipa_tmp = ROOT_DIR / "_tmp_ipa_build"
    if ipa_tmp.exists():
        shutil.rmtree(ipa_tmp)
    app_bundle = ipa_tmp / "Payload" / "NumisManager.app"
    app_bundle.mkdir(parents=True, exist_ok=True)

    info_plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>NumisManager</string>
    <key>CFBundleExecutable</key>
    <string>NumisManager</string>
    <key>CFBundleIconFile</key>
    <string>Icon.png</string>
    <key>CFBundleIdentifier</key>
    <string>id.numismanager.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>NumisManager</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>MinimumOSVersion</key>
    <string>14.0</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
"""
    (app_bundle / "Info.plist").write_text(info_plist, encoding="utf-8")
    (app_bundle / "PkgInfo").write_text("APPL????", encoding="utf-8")
    shutil.copy2(ROOT_DIR / "static" / "img" / "logo.png", app_bundle / "Icon.png")
    shutil.copytree(assets_www, app_bundle / "www", dirs_exist_ok=True)

    ipa_path = SMARTPHONE_DIR / "NumisManager-iOS-v1.0.0.ipa"
    with zipfile.ZipFile(ipa_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in (ipa_tmp / "Payload").rglob("*"):
            if f.is_file():
                rel = f.relative_to(ipa_tmp).as_posix()
                if "static/uploads/" in rel and not rel.endswith(".gitkeep"):
                    continue
                zf.write(f, rel)

    print(f"Created iOS IPA Archive: {ipa_path} ({ipa_path.stat().st_size / 1024:.1f} KB)")

    # Cleanup temp folders
    shutil.rmtree(ROOT_DIR / "_tmp_apk_build", ignore_errors=True)
    shutil.rmtree(ipa_tmp, ignore_errors=True)


if __name__ == "__main__":
    www_dir = build_android_apk()
    build_ios_packages(www_dir)
    print("ALL SMARTPHONE PACKAGES BUILT SUCCESSFULLY!")
