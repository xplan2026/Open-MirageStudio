import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Bot,
  User,
  CircleCheck,
  CircleAlert,
  CircleDashed,
  PenLine,
  Music,
  Clapperboard,
  Network,
} from 'lucide-react';
import { useChatStore } from '../lib/chat-store';
import { genId } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const QUICK_PROMPTS = [
  { label: '写小说章节', icon: PenLine, prompt: '继续创作《幻觉》下一章，延续米家主线剧情' },
  { label: '创作歌曲', icon: Music, prompt: '为《幻觉》创作一首歌，主题是离别与归航' },
  { label: '制作 MV', icon: Clapperboard, prompt: '为歌曲《归航109》制作一支 MV' },
  { label: '查询族谱', icon: Network, prompt: '查询米家族谱中米长海的子女信息' },
];

function getJwt() {
  return localStorage.getItem('coordinator_jwt') || '';
}

function MessageBubble({ msg }) {
  if (msg.role === 'status') {
    return <StatusCard payload={msg.payload} />;
  }
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-indigo-500 text-white' : 'bg-muted text-foreground',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted',
        )}
      >
        {msg.content || (msg.pending ? '…' : '')}
      </div>
    </div>
  );
}

function StatusCard({ payload }) {
  if (!payload) return null;
  const isError = payload.level === 'error';
  const isSuccess = payload.level === 'success';
  const Icon = isError ? CircleAlert : isSuccess ? CircleCheck : CircleDashed;
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
          isError
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : isSuccess
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
              : 'border-border bg-muted/50 text-muted-foreground',
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', !isError && !isSuccess && 'animate-pulse')} />
        {payload.text}
      </div>
    </div>
  );
}

export default function Chat() {
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const clear = useChatStore((s) => s.clear);
  const setStreaming = useChatStore((s) => s.setStreaming);

  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  /** 处理一条 SSE 事件 */
  const handleEvent = useCallback(
    (event, data) => {
      if (event === 'status') {
        addMessage({
          id: genId('status'),
          role: 'status',
          content: '',
          ts: Date.now(),
          payload: { text: data.message || data.stage, stage: data.stage, level: 'info' },
        });
      } else if (event === 'intent') {
        addMessage({
          id: genId('status'),
          role: 'status',
          content: '',
          ts: Date.now(),
          payload: {
            text: `意图识别：${data.agentId || '未匹配'}（置信度 ${Math.round((data.confidence || 0) * 100)}%）${data.reasoning ? ` · ${data.reasoning}` : ''}`,
            level: 'info',
          },
        });
      } else if (event === 'task') {
        addMessage({
          id: genId('status'),
          role: 'status',
          content: '',
          ts: Date.now(),
          payload: {
            text: `任务已创建：#${data.id} · ${data.agentName || data.agentId}`,
            level: 'info',
          },
        });
      } else if (event === 'progress') {
        addMessage({
          id: genId('status'),
          role: 'status',
          content: '',
          ts: Date.now(),
          payload: {
            text: data.stage,
            level: data.status === 'success' ? 'success' : data.status === 'failed' ? 'error' : 'info',
          },
        });
      } else if (event === 'done') {
        if (data.error) {
          addMessage({
            id: genId('msg'),
            role: 'assistant',
            content: data.reply || '抱歉，任务未能完成，请重试。',
            ts: Date.now(),
          });
        } else {
          addMessage({
            id: genId('msg'),
            role: 'assistant',
            content: data.reply || `任务 ${data.task?.id} 已完成。`,
            ts: Date.now(),
          });
        }
      } else if (event === 'error') {
        addMessage({
          id: genId('msg'),
          role: 'assistant',
          content: `出错了：${data.message || '未知错误'}`,
          ts: Date.now(),
        });
      }
      // 兼容非 SSE 的分块输出：data 是纯文本片段
    },
    [addMessage],
  );

  const send = useCallback(
    async (text) => {
      const content = (text || input).trim();
      if (!content || streaming) return;
      setInput('');

      addMessage({ id: genId('msg'), role: 'user', content, ts: Date.now() });
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/admin/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJwt()}` },
          body: JSON.stringify({ message: content }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          addMessage({
            id: genId('msg'),
            role: 'assistant',
            content: `请求失败（${res.status}）：${err.error || '未知错误'}`,
            ts: Date.now(),
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split('\n\n');
          buffer = parts.pop();

          for (const part of parts) {
            let event = 'message';
            let dataStr = '';
            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) event = line.slice(7).trim();
              else if (line.startsWith('data: ')) dataStr += line.slice(6);
            }
            try {
              handleEvent(event, JSON.parse(dataStr));
            } catch {
              handleEvent(event, { text: dataStr });
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          addMessage({
            id: genId('msg'),
            role: 'assistant',
            content: `连接中断：${err.message}`,
            ts: Date.now(),
          });
        }
      } finally {
        setStreaming(false);
        scrollToBottom();
      }
    },
    [input, streaming, addMessage, handleEvent, setStreaming, scrollToBottom],
  );

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      {/* 消息区 */}
      <ScrollArea ref={scrollRef} className="min-h-0 flex-1 px-4 py-6">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">向大副发起创作指令</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  意图解析 → 任务编排 → Agent 执行，全程流式反馈
                </p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-xs transition-colors hover:border-indigo-500/50 hover:bg-accent/50"
                  >
                    <q.icon className="h-5 w-5 text-indigo-400" />
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {streaming && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在执行…
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区 */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-indigo-500/50">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="输入创作指令，如：写一章《幻觉》小说 / 为《幻觉》创作一首歌…"
            className="chat-input min-h-[40px] max-h-[160px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            rows={1}
          />
          {streaming ? (
            <Button variant="secondary" size="icon" onClick={stop} title="停止">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button size="icon" onClick={() => send()} disabled={!input.trim()} title="发送">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.prompt)}
                className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-indigo-500/50 hover:text-foreground"
              >
                {q.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clear}>
            <Trash2 className="mr-1 h-3 w-3" />
            清空
          </Button>
        </div>
      </div>
    </div>
  );
}
