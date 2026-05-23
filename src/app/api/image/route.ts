import { NextRequest, NextResponse } from 'next/server';
import { internalClient, BUCKET } from '@/server/lib/oss';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    // 使用内网客户端读取图片
    const response = await internalClient.send(command);

    const body = await response.Body?.transformToByteArray();

    if (!body) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    const contentType = response.ContentType || 'image/jpeg';

    return new NextResponse(body as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=3600'
      }
    });
  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json({ error: '获取图片失败' }, { status: 500 });
  }
}
