import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function extractJson(stdout: string): any {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("No JSON found in openclaw output");
  return JSON.parse(stdout.slice(start));
}

async function parseJsonBody(req: any): Promise<any> {
  if (typeof req.json === 'function') return req.json();
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function sendJson(res: any, status: number, body: unknown): void {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(body);
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function askOpenClaw(text: string, sessionId: string, timeout = 120): Promise<string> {
  const { stdout } = await execFileAsync("openclaw", [
    "agent", "--session-id", sessionId, "--message", text, "--json", "--timeout", String(timeout),
  ], { encoding: "utf8", cwd: process.cwd() });
  const parsed = extractJson(stdout);
  const payloads = parsed?.result?.payloads || [];
  const texts = payloads.map((p: any) => p?.text).filter(Boolean);
  return texts.join("\n").trim() || "抱歉，我这次没有拿到有效回复。";
}

async function askOllama(text: string): Promise<string> {
  const endpoint = process.env.VOICE_OLLAMA_ENDPOINT || "http://127.0.0.1:11434/api/generate";
  const model = process.env.VOICE_OLLAMA_MODEL || "qwen2.5:7b";
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text, stream: false }),
  });
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return (data.response || "").trim() || "抱歉，我这次没有组织好回复。";
}

export async function handleVoiceBrainHealthRoute(_req: any, res: any): Promise<void> {
  sendJson(res, 200, {
    status: "ok",
    role: "text-brain-plugin",
    route: "/voice/chat",
    backend: process.env.VOICE_REPLY_BACKEND || "openclaw",
    sessionId: process.env.VOICE_OPENCLAW_SESSION_ID || "voice-bridge-session",
  });
}

export async function handleVoiceBrainChatRoute(req: any, res: any): Promise<void> {
  try {
    const body = await parseJsonBody(req);
    const text = String(body?.text || "").trim();
    if (!text) return sendJson(res, 400, { ok: false, error: "需要 text 参数" });

    const backend = (process.env.VOICE_REPLY_BACKEND || "openclaw").trim().toLowerCase();
    const sessionId = process.env.VOICE_OPENCLAW_SESSION_ID || "voice-bridge-session";
    const timeout = Number(process.env.VOICE_OPENCLAW_TIMEOUT || 120);
    const responseText = backend === "ollama" ? await askOllama(text) : await askOpenClaw(text, sessionId, timeout);

    sendJson(res, 200, {
      ok: true,
      input_text: text,
      response_text: responseText,
      reply_backend: backend,
      session_id: backend === "openclaw" ? sessionId : null,
    });
  } catch (err: any) {
    sendJson(res, 500, { ok: false, error: String(err?.message || err) });
  }
}
