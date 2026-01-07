/**
 * longform_runner.js
 * Separate runner for long_form_projects ONLY.
 * Does NOT touch your existing "videos" runner.
 *
 * Requirements:
 * - Node 18+
 * - ffmpeg available (we try ffmpeg-static first, then system ffmpeg)
 * - yt-dlp installed and available in PATH (recommended)
 *
 * Env needed:
 * RUNNER_API_KEY=...
 * (uses your existing runner-auth edge function to fetch supabase url + service key + user id)
 */
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

// node-fetch v2 style dynamic import compatibility
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Load .env manually (same style as your current runner) ----
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const [keyRaw, ...valueParts] = trimmed.split("=");
        if (!keyRaw || valueParts.length === 0) return;
        const key = keyRaw.trim();
        let value = valueParts.join("=").trim();
        value = value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
        process.env[key] = value;
      });
    }
  } catch (e) {
    console.error("Error loading .env:", e.message);
  }
}
loadEnv();

// ---- Config ----
const API_KEY = process.env.RUNNER_API_KEY;
const POLL_INTERVAL = Number(process.env.LONGFORM_POLL_INTERVAL_MS || 30000);
const MAX_CLIP_SECONDS = Number(process.env.MAX_CLIP_SECONDS || 10);
const SUPABASE_FUNCTION_URL =
  process.env.SUPABASE_FUNCTION_URL || "https://qhzwksaeogpwgvttcxej.supabase.co/functions/v1";

if (!API_KEY) {
  console.error("❌ RUNNER_API_KEY missing in .env");
  process.exit(1);
}

let supabaseUrl = "";
let supabaseServiceKey = "";
let userId = "";

// Prefer bundled ffmpeg binaries if available (Windows friendly)
let ffmpegPath = "ffmpeg";
let ffprobePath = "ffprobe";
try {
  const ffmpegStatic = require("ffmpeg-static");
  if (ffmpegStatic) ffmpegPath = ffmpegStatic;
} catch {}
try {
  const ffprobeStatic = require("ffprobe-static");
  if (ffprobeStatic?.path) ffprobePath = ffprobeStatic.path;
} catch {}

// ---- Video Filters (ffmpeg filter strings) ----
const VIDEO_FILTERS = {
  none: '',
  black_and_white: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
  sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
  warm: 'colorbalance=rs=.1:gs=-.05:bs=-.1:rm=.1:gm=0:bm=-.1:rh=.1:gh=0:bh=-.05',
  cool: 'colorbalance=rs=-.1:gs=0:bs=.1:rm=-.1:gm=0:bm=.1:rh=-.05:gh=0:bh=.1',
  vibrant: 'eq=saturation=1.4:contrast=1.1:brightness=0.02',
  muted: 'eq=saturation=0.6:contrast=0.95',
  retro: 'curves=vintage,eq=saturation=0.8:contrast=1.05',
  film_grain: 'noise=c0s=8:c0f=u+t',
  vhs: 'noise=c0s=12:c0f=u+t,colorbalance=rs=.1:gs=-.05:bs=-.1,eq=saturation=0.85',
  vintage: 'curves=vintage',
  polaroid: 'colorbalance=rs=.05:gs=.02:bs=-.08,eq=saturation=0.9:contrast=1.05:brightness=0.03',
  vignette: 'vignette=PI/4',
  vignette_strong: 'vignette=PI/3',
  sharpen: 'unsharp=5:5:1.0:5:5:0.0',
  soft_glow: 'gblur=sigma=1.5,eq=brightness=0.03',
  high_contrast: 'eq=contrast=1.3:brightness=-0.02',
  low_contrast: 'eq=contrast=0.8:brightness=0.05',
  cinematic_teal_orange: 'colorbalance=rs=.15:gs=-.05:bs=-.15:rm=.1:gm=-.02:bm=.1:rh=-.05:gh=.02:bh=.15,eq=contrast=1.1:saturation=1.1',
  cinematic_cold: 'colorbalance=rs=-.15:gs=0:bs=.2:rm=-.1:gm=.02:bm=.15,eq=contrast=1.15:saturation=0.9',
  cinematic_warm: 'colorbalance=rs=.2:gs=.1:bs=-.15:rm=.15:gm=.05:bm=-.1,eq=contrast=1.1:saturation=1.05',
  blockbuster: 'eq=saturation=1.3:contrast=1.2:brightness=0.02,unsharp=3:3:0.5:3:3:0.0',
  noir: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,eq=contrast=1.4:brightness=-0.05,vignette=PI/3',
  documentary: 'eq=saturation=0.85:contrast=1.05,unsharp=3:3:0.3:3:3:0.0',
};

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function shInherit(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function authenticate() {
  console.log("🔐 Authenticating via runner-auth...");
  const res = await fetch(`${SUPABASE_FUNCTION_URL}/runner-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: API_KEY }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`runner-auth failed: ${t}`);
  }
  const data = await res.json();
  supabaseUrl = data.supabase_url;
  supabaseServiceKey = data.service_role_key;
  userId = data.user_id;
  console.log("✅ Auth OK");
}

async function supabaseRequest(endpoint, options = {}) {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase request failed: ${t}`);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Only fetch pending long-form projects
async function fetchPendingLongformProjects() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const endpoint =
    `long_form_projects?user_id=eq.${userId}` +
    `&or=(status.eq.pending_processing,and(status.eq.downloading_clips,updated_at.lt.${fiveMinutesAgo}))` +
    `&select=*` +
    `&order=created_at.asc`;

  return await supabaseRequest(endpoint);
}

async function updateLongformProject(projectId, fields) {
  await supabaseRequest(`long_form_projects?id=eq.${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

// Storage helper
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "videos";

async function downloadFromStorage(storagePath, localPath) {
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  const url = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${encoded}`;

  console.log("📥 Storage download:", storagePath);
  const res = await fetch(url, {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Download failed: ${t}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(localPath, buf);
  return localPath;
}

async function uploadToStorage(storagePath, localPath) {
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  const url = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${encoded}`;

  console.log("☁️ Storage upload:", storagePath);

  const contentType = storagePath.endsWith(".mp4")
    ? "video/mp4"
    : storagePath.endsWith(".mp3")
    ? "audio/mpeg"
    : "application/octet-stream";

  const agent = new https.Agent({ keepAlive: true, maxSockets: 2 });

  const maxAttempts = 5;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const stream = fs.createReadStream(localPath);

      const res = await fetch(url, {
        method: "PUT",
        agent,
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: stream,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${t}`);
      }

      return storagePath;
    } catch (e) {
      lastErr = e;

      const msg = String(e?.message || "");
      const looksTransient =
        msg.includes("bad record mac") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("socket hang up") ||
        msg.includes("EPIPE") ||
        msg.includes("fetch failed");

      if (!looksTransient || attempt === maxAttempts) break;

      const waitMs = 1000 * attempt * attempt;
      console.warn(`⚠️ Upload attempt ${attempt} failed (${msg}). Retrying in ${waitMs}ms...`);
      await sleep(waitMs);
    }
  }

  throw lastErr || new Error("Upload failed (unknown)");
}

// ---- Media utils ----
function probeDurationSeconds(filePath) {
  try {
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const out = sh(cmd).trim();
    const d = parseFloat(out);
    return Number.isFinite(d) ? d : 0;
  } catch (e) {
    return 0;
  }
}

function checkFfmpeg() {
  try {
    sh(`"${ffmpegPath}" -version`);
    sh(`"${ffprobePath}" -version`);
    return true;
  } catch {
    return false;
  }
}

// Download a single YouTube URL to mp4
function downloadReferenceVideo(url, outPath) {
  const tempTemplate = outPath.replace(/\.mp4$/i, ".%(ext)s");
  const cmd =
    `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
    `--merge-output-format mp4 -o "${tempTemplate}" --no-playlist "${url}"`;

  shInherit(cmd);

  if (!fs.existsSync(outPath)) {
    const base = outPath.replace(/\.mp4$/i, "");
    const candidates = fs
      .readdirSync(path.dirname(outPath))
      .filter((f) => f.startsWith(path.basename(base) + "."));
    if (candidates.length > 0) {
      const found = path.join(path.dirname(outPath), candidates[0]);
      fs.renameSync(found, outPath);
    }
  }
  if (!fs.existsSync(outPath)) {
    throw new Error("yt-dlp did not produce mp4");
  }
  return outPath;
}

// Extract a clip from video with optional filter
function extractClip({ sourcePath, clipPath, clipSeconds, filterString }) {
  const srcDur = probeDurationSeconds(sourcePath);
  if (srcDur <= 2) throw new Error("Source video too short/unreadable");

  const dur = Math.min(clipSeconds, MAX_CLIP_SECONDS);
  const maxStart = Math.max(0, srcDur - dur - 0.5);
  const start = maxStart > 0 ? Math.random() * maxStart : 0;

  // Build video filter chain
  const scaleFilter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2";
  let vfChain = scaleFilter;
  if (filterString && filterString.trim()) {
    vfChain = `${scaleFilter},${filterString}`;
  }

  const cmd =
    `"${ffmpegPath}" -y -ss ${start.toFixed(3)} -i "${sourcePath}" -t ${dur.toFixed(3)} ` +
    `-vf "${vfChain}" ` +
    `-r 30 -c:v libx264 -preset veryfast -crf 23 -an "${clipPath}"`;

  sh(cmd);

  if (!fs.existsSync(clipPath)) throw new Error("Clip extraction failed");
  return clipPath;
}

function concatClips(clips, outPath) {
  const listPath = outPath + ".txt";
  fs.writeFileSync(listPath, clips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  const cmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${listPath}" -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p "${outPath}"`;
  sh(cmd);
  return outPath;
}

// Adjust background music to match video duration (loop if shorter, trim if longer)
function adjustMusicDuration(musicPath, targetDuration, outputPath) {
  const musicDur = probeDurationSeconds(musicPath);
  if (musicDur <= 0) {
    console.warn("⚠️ Could not determine music duration, using as-is");
    fs.copyFileSync(musicPath, outputPath);
    return outputPath;
  }

  console.log(`🎵 Music duration: ${musicDur.toFixed(1)}s, Target: ${targetDuration.toFixed(1)}s`);

  if (musicDur >= targetDuration) {
    // Music is longer - just trim it
    console.log("  → Trimming music to fit video length");
    const cmd = `"${ffmpegPath}" -y -i "${musicPath}" -t ${targetDuration.toFixed(3)} -c:a aac -b:a 192k "${outputPath}"`;
    sh(cmd);
  } else {
    // Music is shorter - loop it
    const loops = Math.ceil(targetDuration / musicDur);
    console.log(`  → Looping music ${loops}x to fit video length`);
    const cmd = `"${ffmpegPath}" -y -stream_loop ${loops - 1} -i "${musicPath}" -t ${targetDuration.toFixed(3)} -c:a aac -b:a 192k "${outputPath}"`;
    sh(cmd);
  }

  return outputPath;
}

// Mix voiceover + bg music with ducking
function muxWithAudio({ videoPath, voicePath, bgMusicPath, outPath }) {
  const run = (args) => {
    const r = spawnSync(ffmpegPath, args, { encoding: "utf8" });
    if (r.status !== 0) {
      throw new Error((r.stderr || r.stdout || "").trim());
    }
  };

  if (bgMusicPath && fs.existsSync(bgMusicPath)) {
    const filter =
      "[1:a]volume=1.0,asplit=2[vo_sc][vo_mix];" +
      "[2:a]volume=0.18[bg];" +
      "[bg][vo_sc]sidechaincompress=threshold=0.02:ratio=12:attack=5:release=250[duck];" +
      "[duck][vo_mix]amix=inputs=2:duration=first:dropout_transition=2[mix]";

    run([
      "-y",
      "-i", videoPath,
      "-i", voicePath,
      "-i", bgMusicPath,
      "-filter_complex", filter,
      "-map", "0:v",
      "-map", "[mix]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outPath,
    ]);
  } else {
    run([
      "-y",
      "-i", videoPath,
      "-i", voicePath,
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outPath,
    ]);
  }

  if (!fs.existsSync(outPath)) throw new Error("Final mux failed");
}

// Download background music URL.
// - Try plain fetch first (fast for direct mp3 links)
// - If blocked (e.g. 403 AccessDenied from CDN/S3), fall back to yt-dlp which handles many hosts with proper headers/cookies.
async function downloadUrlToFile(url, outPath) {
  // 1) Try direct download (works for most direct mp3 links)
  try {
    const res = await fetch(url, {
      headers: {
        // Some CDNs block unknown clients; a browser-ish UA improves success rates.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "audio/*,*/*;q=0.9",
      },
    });

    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      return outPath;
    }

    // Non-2xx: often "AccessDenied" XML from S3/CDN
    const errBody = await res.text().catch(() => "");
    throw new Error(`Music download blocked (${res.status}): ${errBody.substring(0, 200)}`);
  } catch (e) {
    console.warn(`⚠️ Direct music download failed, trying yt-dlp... (${e.message || e})`);
  }

  // 2) Fallback: yt-dlp extraction
  const outTemplate = outPath.endsWith(".mp3") ? outPath : `${outPath}.mp3`;
  const tpl = outTemplate.replace(/\.mp3$/i, ".%(ext)s");

  let extraHeaders = "";
  try {
    const host = new URL(url).hostname;
    // Mixkit commonly requires a referer.
    if (host.includes("mixkit.co")) {
      extraHeaders =
        " --add-header \"Referer:https://mixkit.co/\"" +
        " --add-header \"User-Agent:Mozilla/5.0\"";
    } else {
      extraHeaders = " --add-header \"User-Agent:Mozilla/5.0\"";
    }
  } catch {
    extraHeaders = " --add-header \"User-Agent:Mozilla/5.0\"";
  }

  const cmd =
    `yt-dlp -x --audio-format mp3 --audio-quality 0` +
    `${extraHeaders} ` +
    `-o "${tpl}" --no-playlist "${url}"`;

  shInherit(cmd);

  if (!fs.existsSync(outTemplate)) {
    throw new Error("yt-dlp did not produce an audio file");
  }

  return outTemplate;
}


// ---- Core longform processor ----
async function processLongformProject(project) {
  console.log("\n🎬 Long-form:", project.id, "-", project.topic);

  const workDir = path.join(process.cwd(), "downloads", "longform", project.id);
  const sourcesDir = path.join(workDir, "sources");
  const clipsDir = path.join(workDir, "clips");
  ensureDir(sourcesDir);
  ensureDir(clipsDir);

  try {
    await updateLongformProject(project.id, {
      status: "downloading_clips",
      processing_progress: 5,
      error_message: null,
    });

    // 1) Voiceover
    if (!project.voiceover_path) throw new Error("voiceover_path missing");
    const voicePath = path.join(workDir, "voiceover.mp3");
    await downloadFromStorage(project.voiceover_path, voicePath);

    const voiceDur = probeDurationSeconds(voicePath);
    if (voiceDur <= 1) throw new Error("Voiceover duration invalid");
    console.log(`🎤 Voiceover duration: ${voiceDur.toFixed(1)}s`);

    // Get video filter
    const filterName = project.video_filter || 'none';
    const filterString = VIDEO_FILTERS[filterName] || '';
    if (filterName !== 'none') {
      console.log(`🎨 Applying video filter: ${filterName}`);
    }

    // 2) Download reference videos
    const refs = Array.isArray(project.reference_urls) ? project.reference_urls : [];
    if (refs.length === 0) throw new Error("reference_urls empty");

    const downloaded = [];
    for (let i = 0; i < refs.length; i++) {
      const url = refs[i];
      const out = path.join(sourcesDir, `source_${i}.mp4`);
      console.log(`📥 Ref ${i + 1}/${refs.length}: ${url}`);
      try {
        downloadReferenceVideo(url, out);
        downloaded.push(out);
      } catch (e) {
        console.warn("⚠️ Download failed:", e.message);
      }
      const p = 10 + Math.round(((i + 1) / refs.length) * 20);
      await updateLongformProject(project.id, { processing_progress: p });
    }

    if (downloaded.length === 0) throw new Error("No reference videos downloaded");

    await updateLongformProject(project.id, {
      status: "assembling",
      processing_progress: 35,
    });

    // 3) Correct clip logic
    const numberOfClips = Math.ceil(voiceDur / MAX_CLIP_SECONDS);
    console.log(`✅ Need clips: ceil(${voiceDur.toFixed(1)}/${MAX_CLIP_SECONDS}) = ${numberOfClips}`);

    const clipPaths = [];
    for (let i = 0; i < numberOfClips; i++) {
      const sourceIndex = i % downloaded.length;
      const sourcePath = downloaded[sourceIndex];

      const remaining = voiceDur - i * MAX_CLIP_SECONDS;
      const clipSeconds = Math.min(MAX_CLIP_SECONDS, Math.max(1, remaining));

      const clipPath = path.join(clipsDir, `clip_${String(i).padStart(4, "0")}.mp4`);
      console.log(`✂️ Clip ${i + 1}/${numberOfClips} from source ${sourceIndex + 1}: ${clipSeconds.toFixed(1)}s`);
      extractClip({ sourcePath, clipPath, clipSeconds, filterString });
      clipPaths.push(clipPath);

      const p = 35 + Math.round(((i + 1) / numberOfClips) * 35);
      await updateLongformProject(project.id, { processing_progress: p });
    }

    // 4) Concatenate
    console.log("🔗 Concatenating clips...");
    const combinedVideo = path.join(workDir, "combined.mp4");
    concatClips(clipPaths, combinedVideo);

    // Get combined video duration for music adjustment
    const videoDuration = probeDurationSeconds(combinedVideo);
    console.log(`📹 Combined video duration: ${videoDuration.toFixed(1)}s`);

    // 5) Background music (optional) - with duration adjustment
    let bgPath = null;
    if (project.background_music_url) {
      try {
        console.log("🎵 Downloading background music...");
        const rawBgPath = path.join(workDir, "bg_raw.mp3");
        await downloadUrlToFile(project.background_music_url, rawBgPath);
        
        // Adjust music duration to match video
        bgPath = path.join(workDir, "bg.mp3");
        adjustMusicDuration(rawBgPath, videoDuration, bgPath);
        
        // Clean up raw file
        try { fs.unlinkSync(rawBgPath); } catch {}
      } catch (e) {
        console.warn("⚠️ BG music failed:", e.message);
        bgPath = null;
      }
    }

    await updateLongformProject(project.id, { processing_progress: 80 });

    // 6) Mux with audio
    console.log("🎚️ Mixing audio + mux...");
    const finalLocal = path.join(workDir, "final.mp4");
    muxWithAudio({
      videoPath: combinedVideo,
      voicePath,
      bgMusicPath: bgPath,
      outPath: finalLocal,
    });

    await updateLongformProject(project.id, { processing_progress: 90 });

    // 7) Upload final.mp4
    const finalStoragePath = `${userId}/longform/${project.id}/final.mp4`;
    await uploadToStorage(finalStoragePath, finalLocal);

    await updateLongformProject(project.id, {
      status: "ready_for_review",
      final_video_path: finalStoragePath,
      processing_progress: 100,
      error_message: null,
    });

    console.log("✅ Done:", project.id);

    // Cleanup
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
  } catch (e) {
    console.error("❌ Project failed:", e.message);
    await updateLongformProject(project.id, {
      status: "failed",
      error_message: e.message,
    });
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
  }
}

// ---- Poll loop ----
let isPolling = false;

async function poll() {
  if (isPolling) return;
  isPolling = true;
  try {
    const projects = await fetchPendingLongformProjects();
    if (projects && projects.length) {
      console.log(`\n📋 Found ${projects.length} long-form project(s)`);
      for (const p of projects) {
        await updateLongformProject(p.id, { status: "downloading_clips", processing_progress: 1 });
      }
      for (const p of projects) {
        await processLongformProject(p);
      }
    }
  } catch (e) {
    console.error("Polling error:", e.message);
  } finally {
    isPolling = false;
  }
}

async function main() {
  console.log("🎥 Longform Runner (with filters + auto music adjustment)");
  console.log("Bucket:", STORAGE_BUCKET);
  console.log("Max clip seconds:", MAX_CLIP_SECONDS);
  console.log("Poll interval ms:", POLL_INTERVAL);

  if (!checkFfmpeg()) {
    console.error("❌ ffmpeg/ffprobe not found.");
    console.error("Install ffmpeg OR run: npm i ffmpeg-static ffprobe-static");
    process.exit(1);
  }

  await authenticate();
  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
