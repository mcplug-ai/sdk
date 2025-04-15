import { Tool } from "@mcplug/server/mcp";

export const extractToolParams = (tool: Tool) => {
  const { constantsParams, aiParameters } = Object.entries(tool.inputSchema.properties ?? {}).reduce(
    (acc, [key, value]) => {
      if (key.startsWith("_")) {
        Object.assign(acc.constantsParams, { [key.replace("_", "")]: value });
      } else {
        Object.assign(acc.aiParameters, { [key]: value });
      }
      return acc;
    },
    { constantsParams: {} as Record<string, object>, aiParameters: {} as Record<string, object> }
  );

  return { constantsParams, aiParameters };
};
