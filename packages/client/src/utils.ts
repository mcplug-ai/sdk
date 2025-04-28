import { PlugDefinition, ToolDefinition } from "./types";
import { ListToolsResult } from "@modelcontextprotocol/sdk/types.js";

type Tool = ListToolsResult["tools"][number];

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

  const requiredConstants = (tool.inputSchema.required as string[])
    ?.filter((required) => constantsProperties.includes(required.replace("_", "")))
    .map((required) => required.replace("_", ""));

  const areConstantsSet = requiredConstants?.every((required) => constants[required]);

  const constantsValues = constantsProperties.reduce((acc, key) => {
    Object.assign(acc, { [`_${key}`]: constants[key] });
    return acc;
  }, {} as Record<string, string>);

  return { constantsProperties, aiProperties, areConstantsSet, constantsValues };
};

export const getToolDefinitions = (
  tools: ListToolsResult["tools"],
  constants: Record<string, string>
): [ListToolsResult["tools"], Map<string, Record<string, string>>] => {
  const toolConstants = new Map<string, Record<string, string>>();
  const availableTools = tools.reduce((acc, tool) => {
    const { aiProperties, areConstantsSet, constantsValues } = extractToolProperties(tool, constants);

    if (areConstantsSet) {
      toolConstants.set(tool.name, constantsValues);
      acc.push({
        name: tool.name,
        description: tool.description!,
        inputSchema: {
          type: "object",
          properties: aiProperties
        }
      });
    }

    return acc;
  }, [] as ListToolsResult["tools"]);

  return [availableTools, toolConstants];
};

export const getToolList = (plug: PlugDefinition, env: Record<string, string>): ListToolsResult["tools"] => {
  const { availableTools, notAvailableTools } = plug;

  const allTools = availableTools.concat(
    notAvailableTools
      .filter((tool) => tool.if.every((ifCondition) => env[ifCondition]))
      .map((tool) => ({ name: tool.name } as (typeof availableTools)[number]))
  );

  return allTools.reduce((acc, tool) => {
    const definition = plug.toolDefinitions[tool.name];
    acc.push({
      name: tool.name,
      description: definition.description,
      inputSchema: definition.inputSchema
    });

    return acc;
  }, [] as ListToolsResult["tools"]);
};
