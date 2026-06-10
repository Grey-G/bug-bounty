import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/grey/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputVideo = path.join(__dirname, "pay-sh-explainer.webm");
const outputCover = path.join(__dirname, "cover.png");

const width = 720;
const height = 1280;
const fps = 24;
const durationMs = 30000;

const pageHtml = String.raw`
<!doctype html>
<html>
  <body style="margin:0;background:#06100f;">
    <canvas id="stage" width="${width}" height="${height}"></canvas>
    <script>
      const canvas = document.getElementById("stage");
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const fps = ${fps};
      const durationMs = ${durationMs};
      const scenes = [
        { t: 0, title: "Your AI agent needs a paid API.", body: "But wallet prompts every request break the workflow.", tag: "PROBLEM" },
        { t: 4800, title: "Pay.sh makes APIs agent-readable.", body: "Discover the endpoint. Call it. Pay per request in stablecoins.", tag: "PAY.SH" },
        { t: 9500, title: "Safety is the missing piece.", body: "Autonomous software should not get unlimited wallet access.", tag: "RISK" },
        { t: 14200, title: "Use a bounded Solana allowance.", body: "Approve a small USDC budget, set an expiry, and let the agent work inside it.", tag: "ALLOWANCE" },
        { t: 19000, title: "Example: 5 USDC for 30 minutes.", body: "The agent buys market data, an LLM summary, and a report export.", tag: "DEMO" },
        { t: 23800, title: "If the next call exceeds budget...", body: "It fails before execution. No custom credit ledger. No card vault.", tag: "CONTROL" },
        { t: 27400, title: "Pay.sh + Solana allowances", body: "API access for agents, with programmable spending limits.", tag: "BUILD" }
      ];

      function ease(x) {
        return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      }

      function wrap(text, maxWidth, font) {
        ctx.font = font;
        const words = text.split(" ");
        const lines = [];
        let line = "";
        for (const word of words) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        return lines;
      }

      function roundedRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }

      function drawBackground(t) {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "#071411");
        g.addColorStop(0.45, "#0c1d1a");
        g.addColorStop(1, "#06100f");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 54; i++) {
          const x = (i * 137 + t * 0.018) % (W + 120) - 60;
          const y = (i * 211 + Math.sin(t / 1100 + i) * 24) % (H + 160) - 80;
          ctx.globalAlpha = 0.08 + (i % 5) * 0.012;
          ctx.fillStyle = i % 3 === 0 ? "#22d3ee" : i % 3 === 1 ? "#4ade80" : "#fb923c";
          ctx.fillRect(x, y, 2 + (i % 4), 2 + (i % 4));
        }
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "rgba(74,222,128,0.16)";
        ctx.lineWidth = 1;
        for (let y = 100; y < H; y += 92) {
          ctx.beginPath();
          ctx.moveTo(48, y + Math.sin(t / 900 + y) * 5);
          ctx.lineTo(W - 48, y + Math.cos(t / 1000 + y) * 5);
          ctx.stroke();
        }
      }

      function drawPhone(t, sceneIndex) {
        const x = 94;
        const y = 540;
        const w = 532;
        const h = 390;
        roundedRect(x, y, w, h, 28);
        ctx.fillStyle = "rgba(8,20,17,0.82)";
        ctx.fill();
        ctx.strokeStyle = "rgba(167,243,208,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const rows = [
          ["Agent task", "research report"],
          ["Budget", sceneIndex >= 3 ? "5.00 USDC" : "not bounded"],
          ["API call", sceneIndex >= 1 ? "pay.sh/service" : "manual card"],
          ["Status", sceneIndex >= 5 ? "cap checked" : sceneIndex >= 3 ? "approved" : "waiting"]
        ];
        rows.forEach((row, i) => {
          const yy = y + 42 + i * 68;
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          roundedRect(x + 34, yy, w - 68, 48, 14);
          ctx.fill();
          ctx.fillStyle = "#9fb7b1";
          ctx.font = "22px system-ui, sans-serif";
          ctx.fillText(row[0], x + 58, yy + 31);
          ctx.fillStyle = i === 1 && sceneIndex >= 3 ? "#4ade80" : "#f5fff9";
          ctx.font = "700 22px system-ui, sans-serif";
          const valueWidth = ctx.measureText(row[1]).width;
          ctx.fillText(row[1], x + w - 58 - valueWidth, yy + 31);
        });

        const spent = Math.min(1, Math.max(0, (t - 18500) / 5200));
        ctx.fillStyle = "rgba(74,222,128,0.16)";
        roundedRect(x + 34, y + h - 96, w - 68, 26, 13);
        ctx.fill();
        ctx.fillStyle = sceneIndex >= 5 ? "#fb923c" : "#4ade80";
        roundedRect(x + 34, y + h - 96, (w - 68) * (sceneIndex >= 3 ? 0.78 - spent * 0.34 : 0.08), 26, 13);
        ctx.fill();
        ctx.fillStyle = "#a7f3d0";
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText(sceneIndex >= 3 ? "remaining allowance" : "no active allowance", x + 34, y + h - 36);
      }

      function drawFrame(t) {
        drawBackground(t);
        let sceneIndex = scenes.findIndex((scene, i) => t >= scene.t && (!scenes[i + 1] || t < scenes[i + 1].t));
        if (sceneIndex < 0) sceneIndex = scenes.length - 1;
        const scene = scenes[sceneIndex];
        const local = t - scene.t;
        const enter = ease(local / 680);

        ctx.fillStyle = "#4ade80";
        ctx.font = "700 22px system-ui, sans-serif";
        ctx.fillText("PAY.SH FOR AGENTS", 56, 76);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        roundedRect(56, 104, W - 112, 8, 4);
        ctx.fill();
        ctx.fillStyle = "#22d3ee";
        roundedRect(56, 104, (W - 112) * (t / durationMs), 8, 4);
        ctx.fill();

        ctx.fillStyle = scene.tag === "RISK" ? "#fb923c" : scene.tag === "BUILD" ? "#4ade80" : "#22d3ee";
        roundedRect(56, 154, 156, 48, 24);
        ctx.fill();
        ctx.fillStyle = "#06100f";
        ctx.font = "800 20px system-ui, sans-serif";
        ctx.fillText(scene.tag, 82, 185);

        ctx.save();
        ctx.translate(0, (1 - enter) * 34);
        ctx.globalAlpha = enter;
        ctx.fillStyle = "#f8fffb";
        ctx.font = "800 58px system-ui, sans-serif";
        const titleLines = wrap(scene.title, W - 112, "800 58px system-ui, sans-serif");
        titleLines.forEach((line, i) => ctx.fillText(line, 56, 292 + i * 68));

        ctx.fillStyle = "#b7c9c3";
        ctx.font = "32px system-ui, sans-serif";
        const bodyLines = wrap(scene.body, W - 112, "32px system-ui, sans-serif");
        bodyLines.forEach((line, i) => ctx.fillText(line, 56, 292 + titleLines.length * 72 + 44 + i * 44));
        ctx.restore();

        drawPhone(t, sceneIndex);

        const labels = ["Discover", "Call", "Settle", "Receipt"];
        labels.forEach((label, i) => {
          const x = 78 + i * 148;
          const active = sceneIndex >= 1 && (sceneIndex >= 4 || i < 3);
          ctx.fillStyle = active ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.06)";
          roundedRect(x, 1010, 118, 118, 24);
          ctx.fill();
          ctx.strokeStyle = active ? "#22d3ee" : "rgba(255,255,255,0.15)";
          ctx.stroke();
          ctx.fillStyle = active ? "#f5fff9" : "#91a29d";
          ctx.font = "700 20px system-ui, sans-serif";
          const labelWidth = ctx.measureText(label).width;
          ctx.fillText(label, x + 59 - labelWidth / 2, 1081);
        });

        ctx.fillStyle = "#78918a";
        ctx.font = "20px system-ui, sans-serif";
        ctx.fillText("Bounded API payments for vibe coders and technical builders", 56, 1210);
      }

      window.capture = async function capture() {
        const stream = canvas.captureStream(fps);
        const audio = new AudioContext();
        const destination = audio.createMediaStreamDestination();
        const gain = audio.createGain();
        gain.gain.value = 0.018;
        gain.connect(destination);
        for (let i = 0; i < 5; i++) {
          const oscillator = audio.createOscillator();
          oscillator.type = i % 2 ? "triangle" : "sine";
          oscillator.frequency.value = [110, 164.81, 220, 329.63, 440][i];
          oscillator.connect(gain);
          oscillator.start();
          oscillator.stop(audio.currentTime + durationMs / 1000);
        }
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

        const chunks = [];
        const options = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? { mimeType: "video/webm;codecs=vp9,opus", videoBitsPerSecond: 1800000, audioBitsPerSecond: 64000 }
          : { mimeType: "video/webm", videoBitsPerSecond: 1800000 };
        const recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size) chunks.push(event.data);
        };
        const done = new Promise((resolve) => {
          recorder.onstop = resolve;
        });
        recorder.start(250);
        const started = performance.now();
        await new Promise((resolve) => {
          function tick(now) {
            const elapsed = now - started;
            drawFrame(Math.min(durationMs, elapsed));
            if (elapsed < durationMs) {
              requestAnimationFrame(tick);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(tick);
        });
        recorder.stop();
        await done;
        stream.getTracks().forEach((track) => track.stop());
        await audio.close();

        const blob = new Blob(chunks, { type: "video/webm" });
        const buffer = await blob.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));

        drawFrame(1400);
        const cover = canvas.toDataURL("image/png").split(",")[1];
        return { bytes, cover };
      };
    </script>
  </body>
</html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.setContent(pageHtml, { waitUntil: "load" });
const result = await page.evaluate(() => window.capture());
await browser.close();

fs.writeFileSync(outputVideo, Buffer.from(result.bytes));
fs.writeFileSync(outputCover, Buffer.from(result.cover, "base64"));

console.log(JSON.stringify({
  video: outputVideo,
  cover: outputCover,
  videoBytes: fs.statSync(outputVideo).size,
  coverBytes: fs.statSync(outputCover).size,
  durationMs,
  width,
  height,
  fps
}, null, 2));
