import { spawn, ChildProcess } from 'child_process';

export interface LogCallback {
  (data: { type: 'stdout' | 'stderr'; message: string }): void;
}

export interface ScriptResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  killed?: boolean;
}

export class DeployService {
  private workingDir: string;
  private currentProcess: ChildProcess | null = null;
  private hasError: boolean = false;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  setError(): void {
    this.hasError = true;
  }

  getHasError(): boolean {
    return this.hasError;
  }

  resetError(): void {
    this.hasError = false;
  }

  private runCommandWithStreaming(
    command: string,
    args: string[],
    onLog?: LogCallback,
    timeout: number = 600000
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const stdout: string[] = [];
      const stderr: string[] = [];
      let isKilled = false;
      
      this.currentProcess = spawn(command, args, {
        cwd: this.workingDir,
        shell: true
      });

      this.currentProcess.stdout?.on('data', (data) => {
        const message = data.toString();
        stdout.push(message);
        onLog?.({ type: 'stdout', message });
      });

      this.currentProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        stderr.push(message);
        onLog?.({ type: 'stderr', message });
      });

      const timeoutId = setTimeout(() => {
        if (this.currentProcess && !isKilled) {
          this.currentProcess.kill();
        }
        reject(new Error('Command timeout'));
      }, timeout);

      this.currentProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        this.currentProcess = null;
        if (!isKilled) {
          resolve({
            stdout: stdout.join(''),
            stderr: stderr.join(''),
            code: code || 0
          });
        }
      });

      this.currentProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        this.currentProcess = null;
        if (!isKilled) {
          reject(error);
        }
      });
    });
  }

  kill(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      return true;
    }
    return false;
  }

  isRunning(): boolean {
    return this.currentProcess !== null;
  }

  async gitPull(onLog?: LogCallback): Promise<ScriptResult> {
    const startTime = Date.now();
    try {
      const { stdout, stderr, code } = await this.runCommandWithStreaming(
        'git',
        ['pull', 'origin', 'main', '2>&1'],
        onLog
      );
      const success = code === 0;
      return {
        success,
        output: stdout + stderr,
        error: success ? undefined : stderr || 'Git pull failed',
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      if (error.message === 'Command timeout' || error.message === 'SIGTERM') {
        return {
          success: false,
          output: '',
          error: '用户停止',
          duration: Date.now() - startTime,
          killed: true
        };
      }
      return {
        success: false,
        output: '',
        error: error.message || 'Git pull failed',
        duration: Date.now() - startTime
      };
    }
  }

  async prismaPushDocker(onLog?: LogCallback): Promise<ScriptResult> {
    const startTime = Date.now();
    try {
      const { stdout, stderr, code } = await this.runCommandWithStreaming(
        'npx',
        ['dotenv', '-e', '.env.docker', '--', 'prisma', 'db', 'push'],
        onLog
      );
      const success = code === 0;
      return {
        success,
        output: stdout + stderr,
        error: success ? undefined : stderr || 'Prisma push failed',
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      if (error.message === 'Command timeout' || error.message === 'SIGTERM') {
        return {
          success: false,
          output: '',
          error: '用户停止',
          duration: Date.now() - startTime,
          killed: true
        };
      }
      return {
        success: false,
        output: '',
        error: error.message || 'Prisma push failed',
        duration: Date.now() - startTime
      };
    }
  }

  async dockerComposeBuild(onLog?: LogCallback): Promise<ScriptResult> {
    const startTime = Date.now();
    try {
      const { stdout, stderr, code } = await this.runCommandWithStreaming(
        'docker',
        ['compose', 'build', '--no-cache'],
        onLog
      );
      const success = code === 0;
      return {
        success,
        output: stdout + stderr,
        error: success ? undefined : stderr || 'Docker build failed',
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      if (error.message === 'Command timeout' || error.message === 'SIGTERM') {
        return {
          success: false,
          output: '',
          error: '用户停止',
          duration: Date.now() - startTime,
          killed: true
        };
      }
      return {
        success: false,
        output: '',
        error: error.message || 'Docker build failed',
        duration: Date.now() - startTime
      };
    }
  }

  async dockerComposeUp(onLog?: LogCallback): Promise<ScriptResult> {
    const startTime = Date.now();
    try {
      const { stdout, stderr, code } = await this.runCommandWithStreaming(
        'docker',
        ['compose', 'up', '-d'],
        onLog
      );
      const success = code === 0;
      return {
        success,
        output: stdout + stderr,
        error: success ? undefined : stderr || 'Docker up failed',
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      if (error.message === 'Command timeout' || error.message === 'SIGTERM') {
        return {
          success: false,
          output: '',
          error: '用户停止',
          duration: Date.now() - startTime,
          killed: true
        };
      }
      return {
        success: false,
        output: '',
        error: error.message || 'Docker up failed',
        duration: Date.now() - startTime
      };
    }
  }

  async dockerComposeDown(onLog?: LogCallback): Promise<ScriptResult> {
    const startTime = Date.now();
    try {
      const { stdout, stderr, code } = await this.runCommandWithStreaming(
        'docker',
        ['compose', 'down'],
        onLog
      );
      const success = code === 0;
      return {
        success,
        output: stdout + stderr,
        error: success ? undefined : stderr || 'Docker down failed',
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      if (error.message === 'Command timeout' || error.message === 'SIGTERM') {
        return {
          success: false,
          output: '',
          error: '用户停止',
          duration: Date.now() - startTime,
          killed: true
        };
      }
      return {
        success: false,
        output: '',
        error: error.message || 'Docker down failed',
        duration: Date.now() - startTime
      };
    }
  }
}

export const deployService = new DeployService();
