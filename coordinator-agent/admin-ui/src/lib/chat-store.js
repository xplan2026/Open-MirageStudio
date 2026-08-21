/**
 * 聊天状态管理 — zustand + localStorage 持久化
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from './utils';

const MAX_MESSAGES = 200;

export const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [],
      streaming: false,
      currentTask: null, // { id, agentId, agentName, status, intentType }
      streamingText: '', // SSE 流式累积文本

      /** 清空会话 */
      clear: () => set({ messages: [], streaming: false, currentTask: null, streamingText: '' }),

      /** 追加一条消息（保留最近的 MAX_MESSAGES 条） */
      addMessage: (msg) =>
        set((state) => ({
          messages: [...state.messages, msg].slice(-MAX_MESSAGES),
        })),

      /** 添加用户消息 */
      addUserMessage: (content) => {
        const msg = { id: genId('msg'), role: 'user', content, ts: Date.now() };
        get().addMessage(msg);
        return msg;
      },

      /** 添加助手消息（可后续流式更新 content） */
      addAssistantMessage: (content = '') => {
        const msg = { id: genId('msg'), role: 'assistant', content, ts: Date.now() };
        get().addMessage(msg);
        return msg;
      },

      /** 更新指定消息内容 */
      updateMessage: (id, content) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
        })),

      /** 添加系统状态卡片（intent 解析 / 任务进度） */
      addStatus: (payload) => {
        const msg = {
          id: genId('status'),
          role: 'status',
          content: '',
          ts: Date.now(),
          payload,
        };
        get().addMessage(msg);
        return msg;
      },

      setStreaming: (v) => set({ streaming: v }),
      setCurrentTask: (t) => set({ currentTask: t }),
      setStreamingText: (t) => set({ streamingText: t }),
    }),
    {
      name: 'mirage-chat-history',
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
);

export const selectMessages = (s) => s.messages;
export const selectStreaming = (s) => s.streaming;
