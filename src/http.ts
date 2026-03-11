import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { getVoiceBrainRuntime } from "./runtime.js";

const HEALTH_PATH = "/api/voice-brain/health";
const CHAT_PATH = "/api/voice-brain/chat";

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function askOpenClaw(text: string, sessionId: string, timeout = 120): Promise<string> {
  const runtime = getVoiceBrainRuntime();
  const timeoutMs = Math.max(1000, Number.isFinite(timeout) ? timeout * 1000 : 120000);
  const idempotencyKey = `voice-brain-${randomUUID()}`;

  const runResult = await runtime.subagent.run({
    sessionKey: sessionId,
    message: text,
    deliver: false,
    lane: "nested",
    idempotencyKey,
  } as any);

  const runId = (runResult as any)?.runId || idempotencyKey;
  const waitResult = await runtime.subagent.waitForRun({
    runId,
    timeoutMs,
  } as any);

  if ((waitResult as any)?.status !== "ok") {
    const reason = (waitResult as any)?.error || (waitResult as any)?.status || "unknown";
    throw new Error(`OpenClaw runtime run failed: ${reason}`);
  }

  const history = await runtime.subagent.getSessionMessages({
    sessionKey: sessionId,
    limit: 50,
  } as any);

  const responseText = extractLatestAssistantText((history as any)?.messages);
  return responseText || "抱歉，我这次没有拿到有效回复。";
}

function extractLatestAssistantText(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i] as Record<string, unknown> | undefined;
    if (!msg || msg.role !== "assistant") continue;
    const text = extractAssistantText(msg).trim();
    if (text) return text;
  }
  return "";
}

function extractAssistantText(message: Record<string, unknown>): string {
  const direct = typeof message.text === "string" ? message.text : "";
  if (direct.trim()) return direct;
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const chunks: string[] = [];
  for (const part of content) {
    if (typeof part === "string") chunks.push(part);
    else if (part && typeof part === "object") {
      const node = part as Record<string, unknown>;
      if (typeof node.text === "string") chunks.push(node.text);
      else if (typeof node.content === "string") chunks.push(node.content);
    }
  }
  return chunks.join("").trim();
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

export async function handleVoiceBrainHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === HEALTH_PATH) {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET");
      res.end("Method Not Allowed");
      return true;
    }
    sendJson(res, 200, {
      status: "ok",
      role: "text-brain-plugin",
      route: CHAT_PATH,
      backend: process.env.VOICE_REPLY_BACKEND || "openclaw",
      sessionId: process.env.VOICE_OPENCLAW_SESSION_ID || "voice-bridge-session",
    });
    return true;
  }

  if (url.pathname !== CHAT_PATH) return false;
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return true;
  }

  try {
    const body = await parseJsonBody(req);
    const text = String(body?.text || "").trim();
    if (!text) {
      sendJson(res, 400, { ok: false, error: "需要 text 参数" });
      return true;
    }

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
    return true;
  } catch (err: any) {
    sendJson(res, 500, { ok: false, error: String(err?.message || err) });
    return true;
  }
}
