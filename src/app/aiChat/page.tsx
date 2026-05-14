'use client';
import { useState } from 'react';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { Button } from '@heroui/button';
import { Textarea } from '@heroui/input';
import { Avatar } from '@heroui/avatar';
import { Card, CardBody } from '@heroui/card';
import { Send, Plus } from 'lucide-react';
import { ThemeSwitch } from '@/components/theme-switch';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
};

export default function ChatPage() {
  const [sendMsg, setSendMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: '我在故宫周边 3km 范围内为你找到了 5 张照片。',
      timestamp: new Date()
    }
  ]);

  const onSend = async () => {
    if (!sendMsg.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: sendMsg,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    // setSendMsg('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputText: userMessage.content })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: data.data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* --- 左侧侧边栏 Sidebar --- */}
      <aside className="hidden md:flex flex-col w-[260px] border-r border-divider bg-content1/50">
        <div className="p-4">
          <Button
            className="w-full justify-start font-medium"
            variant="flat"
            startContent={<Plus size={18} />}
          >
            新对话
          </Button>
        </div>
        <ScrollShadow className="flex-1 px-2">
          {/* 这里循环展示历史对话列表 */}
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="p-3 my-1 rounded-xl hover:bg-content2 cursor-pointer transition-colors text-sm text-default-600"
            >
              故宫附近的雪景照片分析...
            </div>
          ))}
        </ScrollShadow>
      </aside>

      {/* --- 主聊天区域 Main Content --- */}
      <main className="flex flex-col flex-1 relative bg-background">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">AI 助手</h1>
          </div>
          <ThemeSwitch className="scale-85" />
        </header>

        {/* 聊天内容区 */}
        <ScrollShadow className="flex-1 p-4 md:p-8 space-y-6">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl mx-auto ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {msg.role === 'user' ? (
                <Avatar
                  size="sm"
                  src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                />
              ) : (
                <Avatar size="sm" name="AI" className="bg-secondary" />
              )}
              <Card
                className={`${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-content2'
                }`}
              >
                <CardBody className="py-2 px-4">{msg.content}</CardBody>
              </Card>
            </div>
          ))}
        </ScrollShadow>

        {/* --- 底部输入框 Input Area --- */}
        <footer className="p-4 md:pb-8 max-w-4xl w-full mx-auto">
          <div className="relative group">
            <Textarea
              variant="bordered"
              placeholder="问问 AI 摄影助手..."
              disableAnimation
              disableAutosize
              classNames={{
                input: 'min-h-[54px] py-4',
                inputWrapper:
                  'pr-12 shadow-sm group-hover:border-primary transition-colors'
              }}
              onValueChange={setSendMsg}
            />
            <Button
              isIconOnly
              size="sm"
              color="primary"
              className="absolute right-2 bottom-2 z-10"
              onPress={onSend}
            >
              <Send size={18} />
            </Button>
          </div>
          <p className="text-center text-tiny text-default-400 mt-2">
            由 Moondream & Qwen 提供语义支持
          </p>
        </footer>
      </main>
    </div>
  );
}
