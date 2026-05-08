import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const processes = [];
let shuttingDown = false;

function removeQuarantineIfNeeded() {
  if (process.platform !== "darwin") {
    return;
  }

  const targets = ["node_modules", "frontend/node_modules", "backend/node_modules"]
    .map((target) => path.join(rootDir, target));

  const result = spawnSync("xattr", ["-dr", "com.apple.quarantine", ...targets], {
    stdio: "ignore",
  });

  if (result.error || result.status !== 0) {
    console.warn("[dev] Skipped quarantine cleanup; continuing startup.");
  }
}

function spawnService(name, command, args, options = {}) {
  /** Vite “port in use” gibi durumlarda stderr’de aramak için */
  const stderrTail = { value: "" };

  const child = spawn(command, args, {
    cwd: options.cwd ?? rootDir,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: ["inherit", "pipe", "pipe"],
  });

  const prefix = `[${name}]`;
  child.stdout.on("data", (chunk) => {
    process.stdout.write(`${prefix} ${chunk.toString().replace(/\n/g, `\n${prefix} `)}`.replace(`${prefix} `, prefix + " "));
  });
  child.stderr.on("data", (chunk) => {
    const s = chunk.toString();
    stderrTail.value = (stderrTail.value + s).slice(-8000);
    process.stderr.write(`${prefix} ${s.replace(/\n/g, `\n${prefix} `)}`.replace(`${prefix} `, prefix + " "));
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    if (code === 1 && name === "backend") {
      console.error(
        `${prefix} Port 3000 is already in use. Stop the existing backend process and run "npm run dev" again.`,
      );
    }
    console.error(`${prefix} exited with ${reason}`);

    // Backend çökünce tüm süreci öldürmeyelim: Vite ayakta kalsın (localhost:5173 "connection refused" olmaz).
    // API için backend'i ayrı terminalde yeniden başlat veya kökten `npm run dev` çalıştır.
    if (name === "backend") {
      const idx = processes.indexOf(child);
      if (idx !== -1) {
        processes.splice(idx, 1);
      }
      console.error(
        "[dev] Ön yüz (Vite) çalışmaya devam ediyor; API (backend) durdu. Yenile: başka terminalde `cd backend && npm run dev` (veya `npm start`) ya da kökten yeniden `npm run dev` / `npm run dev:lan`.",
      );
      return;
    }

    // İkinci Vite denemesi 5173 doluysa shutdown yapma — zaten çalışan Vite + yeni backend çoğu zaman yeterli.
    if (
      name === "frontend" &&
      !signal &&
      code === 1 &&
      /already in use|EADDRINUSE/i.test(stderrTail.value)
    ) {
      const idx = processes.indexOf(child);
      if (idx !== -1) {
        processes.splice(idx, 1);
      }
      console.error(
        "[dev] Vite başlatılamadı (port muhtemelen dolu). Backend çalışmaya devam ediyor. Çözüm: eski `npm run dev` sürecini durdurun veya `lsof -iTCP:5173` ile PID’yi kapatıp yeniden deneyin.",
      );
      return;
    }

    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`${prefix} failed to start: ${error.message}`);
    shutdown(1);
  });

  processes.push(child);
}

function runCommand(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[${name}] failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 150);
}

removeQuarantineIfNeeded();

runCommand(
  "backend-build",
  process.execPath,
  [path.join(rootDir, "backend/node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"],
  {
    cwd: path.join(rootDir, "backend"),
  },
);

spawnService(
  "backend",
  process.execPath,
  [path.join(rootDir, "backend/node_modules/tsx/dist/cli.mjs"), "watch", "src/server.ts"],
  {
    cwd: path.join(rootDir, "backend"),
    // backend/package.json `dev` ile aynı: local DB (Supabase vb.) self-signed zinciri Node'u reddeder
    env: {
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      ...(process.env.DEV_LAN === "1" ? { LISTEN_HOST: "0.0.0.0" } : {}),
    },
  },
);

spawnService(
  "frontend",
  process.execPath,
  [path.join(rootDir, "frontend/node_modules/vite/bin/vite.js")],
  {
    cwd: path.join(rootDir, "frontend"),
  },
);

if (process.env.DEV_LAN === "1") {
  const ipv4 = Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => n.address)
    /** 169.254.x.x link-local — genelde hotspot tabletten erişirken gereksiz, CORS karmaşası yaratır */
    .filter((ip) => !ip.startsWith("169.254."));
  console.log("");
  console.log("[dev] ─── LAN ═══════════════════════════════════════════════════");
  console.log("");
  console.log("[dev] A ÇIKICI: Adres ÇUBUGUNDA SADECE IP YAZMA — mutlaka :5173 ve http ile giriş olsun.");
  console.log("[dev]   Yanlış: 172.20.10.4  (Safari bağlanamaz)");
  console.log('[dev]   Doğru:  http://172.20.10.4:5173/login');
  console.log("");
  console.log("[dev] Bu makineden (Mac):  http://localhost:5173/");
  console.log("");
  console.log("[dev] Tablet / diğer cihaz (aynı hotspot / Wi‑Fi):");
  if (ipv4.length === 0) {
    console.log("       (IPv4 çıkmadı — `ifconfig en0 | grep inet` ile IP’yi bulup http://IP:5173 yazın)");
  }
  for (const ip of ipv4) {
    console.log(`       http://${ip}:5173/`);
  }
  console.log("");
  const sampleIp = ipv4[0];
  console.log(sampleIp ? `[dev] Örnek tam adres: http://${sampleIp}:5173/` : "");
  console.log("");
  const corsSample = ["http://localhost:5173", ...ipv4.map((ip) => `http://${ip}:5173`)].join(",");
  console.log("[dev] Backend CORS (backend/.env) — güncelle ve kaydet:");
  console.log(`       CORS_ORIGINS=${corsSample}`);
  console.log("");
  console.log("[dev] ────────────────────────────────────────────────────────────");
  console.log("");
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
