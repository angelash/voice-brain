import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk/core";
import { setVoiceBrainRuntime } from "./src/runtime.js";
import { handleVoiceBrainChatRoute, handleVoiceBrainHealthRoute } from "./src/http.js";

const plugin = {
  id: "voice-brain",
  name: "Voice Brain",
  description: "Gateway-native text brain route for voice shells",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setVoiceBrainRuntime(api.runtime);
    api.registerHttpRoute({
      path: "/voice/health",
      auth: "plugin",
      match: "exact",
      handler: handleVoiceBrainHealthRoute,
    });
    api.registerHttpRoute({
      path: "/voice/chat",
      auth: "plugin",
      match: "exact",
      handler: handleVoiceBrainChatRoute,
    });
  },
};

export default plugin;
