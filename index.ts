import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { setVoiceBrainRuntime } from "./src/runtime.js";
import { handleVoiceBrainHttpRequest } from "./src/http.js";

const API_ROUTES = ["/api/voice-brain/health", "/api/voice-brain/chat"] as const;

const plugin = {
  id: "voice-brain",
  name: "Voice Brain",
  description: "Gateway-native text brain route for voice shells",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setVoiceBrainRuntime(api.runtime);
    const apiAny = api as any;
    const auth = (process.env.VOICE_BRAIN_ROUTE_AUTH || "plugin") as "gateway" | "plugin";

    if (typeof apiAny.registerHttpRoute === "function") {
      for (const path of API_ROUTES) {
        apiAny.registerHttpRoute({
          path,
          auth,
          match: "exact",
          handler: handleVoiceBrainHttpRequest,
        });
      }
      return;
    }

    if (typeof apiAny.registerHttpHandler === "function") {
      apiAny.registerHttpHandler(handleVoiceBrainHttpRequest);
      return;
    }
  },
};

export default plugin;
