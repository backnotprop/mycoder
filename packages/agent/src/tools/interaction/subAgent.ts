import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  backgroundToolRegistry,
  BackgroundToolStatus,
} from '../../core/backgroundTools.js';
import {
  getDefaultSystemPrompt,
  AgentConfig,
} from '../../core/toolAgent/config.js';
import { toolAgent } from '../../core/toolAgent/toolAgentCore.js';
import { Tool, ToolContext } from '../../core/types.js';
import { getTools } from '../getTools.js';

const parameterSchema = z.object({
  description: z
    .string()
    .describe("A brief description of the sub-agent's purpose (max 80 chars)"),
  goal: z
    .string()
    .describe('The main objective that the sub-agent needs to achieve'),
  projectContext: z
    .string()
    .describe('Context about the problem or environment'),
  workingDirectory: z
    .string()
    .optional()
    .describe('The directory where the sub-agent should operate'),
  relevantFilesDirectories: z
    .string()
    .optional()
    .describe('A list of files, which may include ** or * wildcard characters'),
});

const returnSchema = z.object({
  response: z
    .string()
    .describe(
      'The response from the sub-agent including its reasoning and tool usage',
    ),
});

type Parameters = z.infer<typeof parameterSchema>;
type ReturnType = z.infer<typeof returnSchema>;

// Sub-agent specific configuration
const subAgentConfig: AgentConfig = {
  maxIterations: 200,
  provider: 'anthropic',
  model: 'claude-3-7-sonnet-20250219',
  maxTokens: 4096,
  temperature: 0.7,
  getSystemPrompt: (context: ToolContext) => {
    return [
      getDefaultSystemPrompt(context),
      'You are a focused AI sub-agent handling a specific task.',
      'You have access to the same tools as the main agent but should focus only on your assigned task.',
      'When complete, call the sequenceComplete tool with your results.',
      'Follow any specific conventions or requirements provided in the task context.',
      'Ask the main agent for clarification if critical information is missing.',
    ].join('\n');
  },
};

export const subAgentTool: Tool<Parameters, ReturnType> = {
  name: 'subAgent',
  description:
    'Creates a sub-agent that has access to all tools to solve a specific task',
  logPrefix: '🤖',
  parameters: parameterSchema,
  parametersJsonSchema: zodToJsonSchema(parameterSchema),
  returns: returnSchema,
  returnsJsonSchema: zodToJsonSchema(returnSchema),
  execute: async (params, context) => {
    const { logger, agentId } = context;

    // Validate parameters
    const {
      description,
      goal,
      projectContext,
      workingDirectory,
      relevantFilesDirectories,
    } = parameterSchema.parse(params);

    // Register this sub-agent with the background tool registry
    const subAgentId = backgroundToolRegistry.registerAgent(
      agentId || 'unknown',
      goal,
    );
    logger.verbose(`Registered sub-agent with ID: ${subAgentId}`);

    // Construct a well-structured prompt
    const prompt = [
      `Description: ${description}`,
      `Goal: ${goal}`,
      `Project Context: ${projectContext}`,
      workingDirectory ? `Working Directory: ${workingDirectory}` : '',
      relevantFilesDirectories
        ? `Relevant Files:\n  ${relevantFilesDirectories}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const tools = getTools({ enableUserPrompt: false });

    // Update config if timeout is specified
    const config: AgentConfig = {
      ...subAgentConfig,
      provider: context.provider,
      model: context.model,
    };

    try {
      const result = await toolAgent(prompt, tools, config, {
        ...context,
        workingDirectory: workingDirectory ?? context.workingDirectory,
      });

      // Update background tool registry with completed status
      backgroundToolRegistry.updateToolStatus(
        subAgentId,
        BackgroundToolStatus.COMPLETED,
        {
          result:
            result.result.substring(0, 100) +
            (result.result.length > 100 ? '...' : ''),
        },
      );

      return { response: result.result };
    } catch (error) {
      // Update background tool registry with error status
      backgroundToolRegistry.updateToolStatus(
        subAgentId,
        BackgroundToolStatus.ERROR,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      throw error;
    }
  },
  logParameters: (input, { logger }) => {
    logger.info(`Delegating task "${input.description}"`);
  },
  logReturns: () => {},
};
