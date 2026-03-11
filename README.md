# voice-brain

Gateway-native OpenClaw plugin for voice shell text routing.

## Purpose

Expose text-brain HTTP routes from the OpenClaw Gateway so a Windows voice shell can send text and receive text replies without a separate standalone server process.

## Current goal

- Native Gateway plugin
- Dedicated voice session for OpenClaw backend
- Optional Ollama fallback backend

## Main files

- `index.ts`
- `openclaw.plugin.json`
- `src/http.ts`
- `src/runtime.ts`
