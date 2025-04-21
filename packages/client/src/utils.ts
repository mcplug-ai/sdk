import { Tool } from "@mcplug/server/mcp";
import { ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import { PlugResponse } from "./types";

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

export const extractToolProperties = (tool: Tool, constants: Record<string, string>) => {
  const { constantsProperties, aiProperties } = Object.entries(tool.inputSchema.properties ?? {}).reduce(
    (acc, [key, value]) => {
      if (key.startsWith("_")) {
        acc.constantsProperties.push(key.replace("_", ""));
      } else {
        Object.assign(acc.aiProperties, { [key]: value });
      }
      return acc;
    },
    { constantsProperties: [] as string[], aiProperties: {} as Record<string, object> }
  );

  const requiredConstants = tool.inputSchema.required?.filter((required) =>
    constantsProperties.includes(required.replace("_", ""))
  );

  const areConstantsSet = requiredConstants?.every((required) => constants[required.replace("_", "")]);

  const constantsValues = constantsProperties.reduce((acc, key) => {
    Object.assign(acc, { [`_${key}`]: constants[key] });
    return acc;
  }, {} as Record<string, string>);

  return { constantsProperties, aiProperties, areConstantsSet, constantsValues };
};

export type ToolDefinition = {
  versionId: string;
  name: string;
  description: string | undefined;
  inputSchema: any;
  constants: Record<string, string>;
};

export const getToolDefinitions = (
  plug: PlugResponse,
  envConstants: Record<string, string>
): [ListToolsResult["tools"], Map<string, ToolDefinition>] => {
  const constants = { ...plug.constants, ...envConstants };

  const toolDefinitions = new Map<string, ToolDefinition>();

  const availableTools: ListToolsResult["tools"] = plug.versions.reduce((acc, version) => {
    version.tools.forEach((tool) => {
      const { aiProperties, areConstantsSet, constantsValues } = extractToolProperties(tool, constants);

      if (areConstantsSet) {
        let accName = tool.name;
        let increment = 1;

        while (toolDefinitions.has(accName)) {
          accName = `${tool.name}_${increment}`;
          increment++;
        }
        toolDefinitions.set(accName, {
          constants: constantsValues,
          description: tool.description,
          inputSchema: aiProperties,
          name: tool.name,
          versionId: version.versionId
        });
        acc.push({
          name: accName,
          description: tool.description!,
          inputSchema: {
            type: "object",
            properties: aiProperties
          }
        });
      }
    });
    return acc;
  }, [] as ListToolsResult["tools"]);

  return [availableTools, toolDefinitions];
};
