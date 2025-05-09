import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ToolContext } from '../../core/types.js';
import { sleep } from '../../utils/sleep.js';
import { getMockToolContext } from '../getTools.test.js';

import { shellMessageTool, NodeSignals } from './shellMessage.js';
import { shellStartTool } from './shellStart.js';

const toolContext: ToolContext = getMockToolContext();

// Helper function to get shellId from shellStart result
const getShellId = (
  result: Awaited<ReturnType<typeof shellStartTool.execute>>,
) => {
  if (result.mode === 'async') {
    return result.shellId;
  }
  throw new Error('Expected async mode result');
};

describe('shellMessageTool', () => {
  let testInstanceId = '';

  beforeEach(() => {
    toolContext.shellTracker.processStates.clear();
  });

  afterEach(() => {
    for (const processState of toolContext.shellTracker.processStates.values()) {
      processState.process.kill();
    }
    toolContext.shellTracker.processStates.clear();
  });

  it('should interact with a running process', async () => {
    // Start a test process - force async mode with timeout
    const startResult = await shellStartTool.execute(
      {
        command: 'cat', // cat will echo back input
        description: 'Test interactive process',
        timeout: 50, // Force async mode for interactive process
      },
      toolContext,
    );

    testInstanceId = getShellId(startResult);

    // Send input and get response
    const result = await shellMessageTool.execute(
      {
        shellId: testInstanceId,
        stdin: 'hello world',
        description: 'Test interaction',
      },
      toolContext,
    );

    // With 'cat', the input should be echoed back exactly
    expect(result.stdout).toBe('hello world');
    expect(result.stderr).toBe('');
    expect(result.completed).toBe(false);

    // Verify the instance ID is valid
    expect(toolContext.shellTracker.processStates.has(testInstanceId)).toBe(
      true,
    );
  });

  it('should handle nonexistent process', async () => {
    const result = await shellMessageTool.execute(
      {
        shellId: 'nonexistent-id',
        description: 'Test invalid process',
      },
      toolContext,
    );

    expect(result.error).toBeDefined();
    expect(result.completed).toBe(false);
  });

  it('should handle process completion', async () => {
    // Start a quick process - force async mode
    const startResult = await shellStartTool.execute(
      {
        command: 'echo "test" && sleep 0.1',
        description: 'Test completion',
        timeout: 0, // Force async mode
      },
      toolContext,
    );

    const shellId = getShellId(startResult);

    // Wait a moment for process to complete
    await sleep(150);

    const result = await shellMessageTool.execute(
      {
        shellId,
        description: 'Check completion',
      },
      toolContext,
    );

    expect(result.completed).toBe(true);
    // Process should still be in processStates even after completion
    expect(toolContext.shellTracker.processStates.has(shellId)).toBe(true);
  });

  it('should handle SIGTERM signal correctly', async () => {
    // Start a long-running process
    const startResult = await shellStartTool.execute(
      {
        command: 'sleep 10',
        description: 'Test SIGTERM handling',
        timeout: 0, // Force async mode
      },
      toolContext,
    );

    const shellId = getShellId(startResult);

    const result = await shellMessageTool.execute(
      {
        shellId,
        signal: NodeSignals.SIGTERM,
        description: 'Send SIGTERM',
      },
      toolContext,
    );
    expect(result.signaled).toBe(true);

    await sleep(50);

    const result2 = await shellMessageTool.execute(
      {
        shellId,
        description: 'Check on status',
      },
      toolContext,
    );

    expect(result2.completed).toBe(true);
    expect(result2.error).toBeUndefined();
  });

  it('should handle signals on terminated process gracefully', async () => {
    // Start a process
    const startResult = await shellStartTool.execute(
      {
        command: 'sleep 1',
        description: 'Test signal handling on terminated process',
        timeout: 0, // Force async mode
      },
      toolContext,
    );

    const shellId = getShellId(startResult);

    // Try to send signal to completed process
    const result = await shellMessageTool.execute(
      {
        shellId,
        signal: NodeSignals.SIGTERM,
        description: 'Send signal to terminated process',
      },
      toolContext,
    );

    expect(result.signaled).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should verify signaled flag after process termination', async () => {
    // Start a process
    const startResult = await shellStartTool.execute(
      {
        command: 'sleep 5',
        description: 'Test signal flag verification',
        timeout: 0, // Force async mode
      },
      toolContext,
    );

    const shellId = getShellId(startResult);

    // Send SIGTERM
    await shellMessageTool.execute(
      {
        shellId,
        signal: NodeSignals.SIGTERM,
        description: 'Send SIGTERM',
      },
      toolContext,
    );

    await sleep(50);

    // Check process state after signal
    const checkResult = await shellMessageTool.execute(
      {
        shellId,
        description: 'Check signal state',
      },
      toolContext,
    );

    expect(checkResult.signaled).toBe(true);
    expect(checkResult.completed).toBe(true);
    expect(toolContext.shellTracker.processStates.has(shellId)).toBe(true);
  });

  it('should respect showStdIn and showStdout parameters', async () => {
    // Start a process with default visibility settings
    const startResult = await shellStartTool.execute(
      {
        command: 'cat',
        description: 'Test with stdin/stdout visibility',
        timeout: 50, // Force async mode
      },
      toolContext,
    );

    const shellId = getShellId(startResult);

    // Verify process state has default visibility settings
    const processState = toolContext.shellTracker.processStates.get(shellId);
    expect(processState?.showStdIn).toBe(false);
    expect(processState?.showStdout).toBe(false);

    // Send input with explicit visibility settings
    await shellMessageTool.execute(
      {
        shellId,
        stdin: 'test input',
        description: 'Test with explicit visibility settings',
        showStdIn: true,
        showStdout: true,
      },
      toolContext,
    );

    // Verify process state still exists
    expect(toolContext.shellTracker.processStates.has(shellId)).toBe(true);
  });

  it('should inherit visibility settings from process state', async () => {
    // Start a process with explicit visibility settings
    const startResult = await shellStartTool.execute(
      {
        command: 'cat',
        description: 'Test with inherited visibility settings',
        timeout: 50, // Force async mode
        showStdIn: true,
        showStdout: true,
      },
      toolContext,
    );

    const shellId = getShellId(startResult);

    // Verify process state has the specified visibility settings
    const processState = toolContext.shellTracker.processStates.get(shellId);
    expect(processState?.showStdIn).toBe(true);
    expect(processState?.showStdout).toBe(true);

    // Send input without specifying visibility settings
    await shellMessageTool.execute(
      {
        shellId,
        stdin: 'test input',
        description: 'Test with inherited visibility settings',
      },
      toolContext,
    );

    // Verify process state still exists
    expect(toolContext.shellTracker.processStates.has(shellId)).toBe(true);
  });
});
