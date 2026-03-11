# voice-brain

Gateway-native OpenClaw plugin for voice shell text routing.

## Purpose

Expose text-brain HTTP routes from the OpenClaw Gateway so a Windows voice shell can send text and receive text replies without a separate standalone server process.

## Current working routes

After validating against the current OpenClaw runtime, the **working plugin routes are**:

- `GET /api/voice-brain/health`
- `POST /api/voice-brain/chat`

These routes are served by the Gateway-native plugin and use the configured backend.

## Backends

Environment variables:

```bash
VOICE_REPLY_BACKEND=openclaw
VOICE_OPENCLAW_SESSION_ID=voice-bridge-session
VOICE_OPENCLAW_TIMEOUT=120
VOICE_OLLAMA_ENDPOINT=http://127.0.0.1:11434/api/generate
VOICE_OLLAMA_MODEL=qwen2.5:7b
```

- `openclaw` = preferred path, using a dedicated OpenClaw session
- `ollama` = fallback / local-model test path

## Example

### Health

```bash
curl -H "Authorization: Bearer <gateway-token>" \
  http://127.0.0.1:18789/api/voice-brain/health
```

### Chat

```bash
curl -X POST \
  -H "Authorization: Bearer <gateway-token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"你好"}' \
  http://127.0.0.1:18789/api/voice-brain/chat
```

## Main files

- `index.ts`
- `openclaw.plugin.json`
- `src/http.ts`
- `src/runtime.ts`
