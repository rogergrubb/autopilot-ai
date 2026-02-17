/**
 * Code Sandbox Tool — Execute code in E2B cloud sandbox
 * 
 * When E2B_API_KEY is set:
 *   Runs code in a secure E2B Sandbox (Firecracker microVM).
 *   Supports Python and JavaScript. Can install packages, read/write files,
 *   generate charts, process data, and return results.
 * 
 * When E2B_API_KEY is NOT set:
 *   Returns a simulated result explaining that code execution requires E2B.
 * 
 * Env vars needed:
 *   E2B_API_KEY — from e2b.dev → Dashboard → API Keys
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface CodeResult {
  status: 'success' | 'error';
  language: string;
  code: string;
  stdout: string;
  stderr: string;
  results: Array<{
    type: 'text' | 'image' | 'html' | 'json';
    content: string;
  }>;
  executionTimeMs: number;
  model: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isE2BConfigured(): boolean {
  return !!process.env.E2B_API_KEY;
}

// ── E2B-powered execution ──────────────────────────────────────────────────

async function executeWithE2B(
  code: string,
  language: 'python' | 'javascript',
  packages?: string[],
): Promise<CodeResult> {
  const startTime = Date.now();

  try {
    const { Sandbox } = await import('@e2b/code-interpreter');

    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY!,
    });

    try {
      // Install packages if requested
      if (packages && packages.length > 0) {
        if (language === 'python') {
          const installCmd = `pip install ${packages.join(' ')}`;
          console.log(`[CodeSandbox] Installing: ${installCmd}`);
          await sandbox.runCode(installCmd, { language: 'python' });
        } else {
          const installCmd = `const { execSync } = require('child_process'); execSync('npm install ${packages.join(' ')}');`;
          await sandbox.runCode(installCmd, { language: 'javascript' });
        }
      }

      // Execute the code
      console.log(`[CodeSandbox] Executing ${language} (${code.length} chars)`);
      const execution = await sandbox.runCode(code, { language });

      const results: CodeResult['results'] = [];

      // Process execution results
      if (execution.results && execution.results.length > 0) {
        for (const result of execution.results) {
          if (result.text) {
            results.push({ type: 'text', content: result.text });
          }
          if (result.png) {
            results.push({ type: 'image', content: `data:image/png;base64,${result.png}` });
          }
          if (result.html) {
            results.push({ type: 'html', content: result.html });
          }
          if (result.json) {
            results.push({ type: 'json', content: JSON.stringify(result.json) });
          }
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[CodeSandbox] Done in ${elapsed}ms — ${results.length} results`);

      return {
        status: execution.error ? 'error' : 'success',
        language,
        code,
        stdout: execution.logs?.stdout?.join('\n') || '',
        stderr: execution.error?.traceback || execution.logs?.stderr?.join('\n') || '',
        results,
        executionTimeMs: elapsed,
        model: 'e2b-sandbox',
      };
    } finally {
      await sandbox.kill();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CodeSandbox] E2B failed:`, message);
    return {
      status: 'error',
      language,
      code,
      stdout: '',
      stderr: message,
      results: [],
      executionTimeMs: Date.now() - startTime,
      model: 'e2b-sandbox',
    };
  }
}

// ── Fallback (no sandbox) ──────────────────────────────────────────────────

function simulateExecution(
  code: string,
  language: 'python' | 'javascript',
): CodeResult {
  return {
    status: 'error',
    language,
    code,
    stdout: '',
    stderr: 'Code execution requires E2B API key. Set E2B_API_KEY environment variable. Get one at e2b.dev → Dashboard → API Keys.',
    results: [{
      type: 'text',
      content: `The following ${language} code was prepared but could not be executed (no sandbox configured):\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nTo enable code execution, add E2B_API_KEY to your environment variables.`,
    }],
    executionTimeMs: 0,
    model: 'none',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Execute code in a secure sandbox.
 * Uses E2B when available, returns error message otherwise.
 */
export async function executeCode(
  code: string,
  language: 'python' | 'javascript' = 'python',
  packages?: string[],
): Promise<CodeResult> {
  if (isE2BConfigured()) {
    return executeWithE2B(code, language, packages);
  }
  return simulateExecution(code, language);
}

/**
 * Execute Python code specifically (convenience wrapper).
 */
export async function executePython(
  code: string,
  packages?: string[],
): Promise<CodeResult> {
  return executeCode(code, 'python', packages);
}

/**
 * Execute JavaScript code specifically (convenience wrapper).
 */
export async function executeJavaScript(
  code: string,
  packages?: string[],
): Promise<CodeResult> {
  return executeCode(code, 'javascript', packages);
}

/**
 * Check if code execution is available.
 */
export function isCodeSandboxAvailable(): boolean {
  return isE2BConfigured();
}
