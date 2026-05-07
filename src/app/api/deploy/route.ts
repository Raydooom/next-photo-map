'use server';

import { NextResponse } from 'next/server';
import { deployService } from '@/server/services/deploy.services';

let isDeploying = false;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const syncDb = url.searchParams.get('syncDb') !== 'false';
  
  const stream = new ReadableStream({
    async start(controller) {
      isDeploying = true;
      
      const sendMessage = (data: { 
        step: string; 
        status: string; 
        message: string; 
        duration?: number;
        isDetail?: boolean;
      }) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const sendDetailLog = (step: string, type: 'stdout' | 'stderr', message: string) => {
        const lines = message.split('\n').filter(line => line.trim());
        for (const line of lines) {
          sendMessage({
            step,
            status: type,
            message: line,
            isDetail: true
          });
        }
      };

      const sendKilledMessage = () => {
        sendMessage({ step: 'done', status: 'killed', message: '构建已停止' });
      };

      try {
        deployService.resetError();
        sendMessage({ step: 'init', status: 'running', message: '开始重建...' });

        // Step 1: Git Pull
        sendMessage({ step: 'git pull', status: 'running', message: '正在拉取代码...' });
        const gitResult = await deployService.gitPull((log) => {
          if (isDeploying) {
            sendDetailLog('git pull', log.type, log.message);
          }
        });
        
        if (!isDeploying) {
          sendKilledMessage();
          controller.close();
          return;
        }

        if (!gitResult.success) {
          deployService.setError();
        }

        sendMessage({
          step: 'git pull',
          status: gitResult.killed ? 'killed' : (gitResult.success ? 'success' : 'error'),
          message: gitResult.killed ? '已停止' : (gitResult.success ? '代码拉取成功' : `代码拉取失败: ${gitResult.error}`),
          duration: gitResult.duration
        });

        if (!gitResult.success || !isDeploying) {
          if (!isDeploying) {
            sendKilledMessage();
          } else {
            sendMessage({ step: 'done', status: 'error', message: `重建失败: ${gitResult.error}` });
          }
          controller.close();
          return;
        }

        // Step 2: Prisma DB Push (optional)
        if (syncDb) {
          sendMessage({ step: 'prisma db push', status: 'running', message: '正在同步数据库...' });
          const prismaResult = await deployService.prismaPushDocker((log) => {
            if (isDeploying) {
              sendDetailLog('prisma db push', log.type, log.message);
            }
          });

          if (!isDeploying) {
            sendKilledMessage();
            controller.close();
            return;
          }

          if (!prismaResult.success) {
            deployService.setError();
          }

          sendMessage({
            step: 'prisma db push',
            status: prismaResult.killed ? 'killed' : (prismaResult.success ? 'success' : 'error'),
            message: prismaResult.killed ? '已停止' : (prismaResult.success ? '数据库同步成功' : `数据库同步失败: ${prismaResult.error}`),
            duration: prismaResult.duration
          });

          if (!prismaResult.success || !isDeploying) {
            if (!isDeploying) {
              sendKilledMessage();
            } else {
              sendMessage({ step: 'done', status: 'error', message: `重建失败: ${prismaResult.error}` });
            }
            controller.close();
            return;
          }
        } else {
          sendMessage({ step: 'prisma db push', status: 'success', message: '跳过数据库同步' });
        }

        // Step 3: Docker Compose Build
        sendMessage({ step: 'docker compose build', status: 'running', message: '正在构建镜像...' });
        const buildResult = await deployService.dockerComposeBuild((log) => {
          if (isDeploying) {
            sendDetailLog('docker compose build', log.type, log.message);
          }
        });

        if (!isDeploying) {
          sendKilledMessage();
          controller.close();
          return;
        }

        if (!buildResult.success) {
          deployService.setError();
        }

        sendMessage({
          step: 'docker compose build',
          status: buildResult.killed ? 'killed' : (buildResult.success ? 'success' : 'error'),
          message: buildResult.killed ? '已停止' : (buildResult.success ? '镜像构建成功' : `镜像构建失败: ${buildResult.error}`),
          duration: buildResult.duration
        });

        if (!buildResult.success || !isDeploying) {
          if (!isDeploying) {
            sendKilledMessage();
          } else {
            sendMessage({ step: 'done', status: 'error', message: `重建失败: ${buildResult.error}` });
          }
          controller.close();
          return;
        }

        // Step 3: Docker Compose Down
        sendMessage({ step: 'docker compose down', status: 'running', message: '正在停止服务...' });
        const downResult = await deployService.dockerComposeDown((log) => {
          if (isDeploying) {
            sendDetailLog('docker compose down', log.type, log.message);
          }
        });

        if (!isDeploying) {
          sendKilledMessage();
          controller.close();
          return;
        }

        if (!downResult.success) {
          deployService.setError();
        }

        sendMessage({
          step: 'docker compose down',
          status: downResult.killed ? 'killed' : (downResult.success ? 'success' : 'warning'),
          message: downResult.killed ? '已停止' : (downResult.success ? '服务停止成功' : `停止服务时出错: ${downResult.error}`),
          duration: downResult.duration
        });

        // 停止服务失败不中断后续步骤，但记录警告

        // Step 4: Docker Compose Up
        sendMessage({ step: 'docker compose up', status: 'running', message: '正在启动服务...' });
        const upResult = await deployService.dockerComposeUp((log) => {
          if (isDeploying) {
            sendDetailLog('docker compose up', log.type, log.message);
          }
        });

        if (!isDeploying) {
          sendKilledMessage();
          controller.close();
          return;
        }

        if (!upResult.success) {
          deployService.setError();
        }

        sendMessage({
          step: 'docker compose up',
          status: upResult.killed ? 'killed' : (upResult.success ? 'success' : 'error'),
          message: upResult.killed ? '已停止' : (upResult.success ? '服务启动成功' : `服务启动失败: ${upResult.error}`),
          duration: upResult.duration
        });

        if (!upResult.success || !isDeploying) {
          if (!isDeploying) {
            sendKilledMessage();
          } else {
            sendMessage({ step: 'done', status: 'error', message: `重建失败: ${upResult.error}` });
          }
          controller.close();
          return;
        }

        sendMessage({ step: 'done', status: 'success', message: '重建完成' });
        controller.close();
      } catch (error) {
        sendMessage({ step: 'done', status: 'error', message: `重建过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}` });
        controller.close();
      } finally {
        isDeploying = false;
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function POST() {
  if (isDeploying) {
    const killed = deployService.kill();
    if (killed) {
      isDeploying = false;
      return NextResponse.json({ success: true, message: '构建已停止' });
    }
    return NextResponse.json({ success: false, message: '无法停止构建' });
  }
  return NextResponse.json({ success: false, message: '没有正在运行的构建' });
}
