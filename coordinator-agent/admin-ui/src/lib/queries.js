/**
 * react-query hooks — 统一数据获取
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export const qk = {
  dashboard: ['dashboard'],
  agents: ['agents'],
  agent: (id) => ['agents', id],
  tasks: (status) => ['tasks', status || 'all'],
  task: (id) => ['tasks', id],
  dataTree: (root) => ['data', 'tree', root || '/'],
  dataFile: (path) => ['data', 'file', path],
  dataSearch: (q) => ['data', 'search', q],
  dataStats: ['data', 'stats'],
  xujie: {
    skills: ['xujie', 'skills'],
    characters: ['xujie', 'characters'],
    character: (name) => ['xujie', 'characters', name],
    characterTimeline: (name) => ['xujie', 'characters', name, 'timeline'],
    outline: ['xujie', 'outline'],
    chapters: ['xujie', 'chapters'],
    chapter: (file) => ['xujie', 'chapters', file],
    notes: ['xujie', 'notes'],
    benchmarks: ['xujie', 'benchmarks'],
    worldbuilding: ['xujie', 'worldbuilding'],
    tracking: ['xujie', 'tracking'],
    feedback: (chapter) => ['xujie', 'feedback', chapter || 'all'],
    impact: (q) => ['xujie', 'impact', q],
    quality: ['xujie', 'quality'],
  },
};

/** Dashboard 概览（轮询 5s） */
export function useDashboard(refetchInterval = 5000) {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => api.getDashboard(),
    refetchInterval,
  });
}

/** Agent 列表 */
export function useAgents(refetchInterval = 10000) {
  return useQuery({
    queryKey: qk.agents,
    queryFn: () => api.getAgents(),
    refetchInterval,
  });
}

/** 单个 Agent */
export function useAgent(id) {
  return useQuery({
    queryKey: qk.agent(id),
    queryFn: () => api.getAgent(id),
    enabled: !!id,
  });
}

/** 任务列表 */
export function useTasks(status, refetchInterval = 5000) {
  return useQuery({
    queryKey: qk.tasks(status),
    queryFn: () => api.getTasks(status),
    refetchInterval,
  });
}

/** 单个任务 */
export function useTask(id, refetchInterval = 3000) {
  return useQuery({
    queryKey: qk.task(id),
    queryFn: () => api.getTask(id),
    enabled: !!id,
    refetchInterval,
  });
}

/** 数据文件树 */
export function useDataTree(root, depth = 6) {
  return useQuery({
    queryKey: qk.dataTree(root),
    queryFn: () => api.getDataTree(root, depth),
    staleTime: 30_000,
  });
}

/** 数据文件内容 */
export function useDataFile(relPath, enabled = true) {
  return useQuery({
    queryKey: qk.dataFile(relPath),
    queryFn: () => api.getDataFile(relPath),
    enabled: !!relPath && enabled,
    staleTime: 15_000,
  });
}

/** 保存文件 */
export function useSaveDataFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }) => api.saveDataFile(path, content),
    onSuccess: (_data, { path }) => {
      qc.invalidateQueries({ queryKey: qk.dataFile(path) });
      qc.invalidateQueries({ queryKey: qk.dataTree });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

/** 产物统计 */
export function useDataStats(refetchInterval = 30000) {
  return useQuery({
    queryKey: qk.dataStats,
    queryFn: () => api.getDataStats(),
    refetchInterval,
  });
}

/** 搜索 */
export function useDataSearch(q, enabled = false) {
  return useQuery({
    queryKey: qk.dataSearch(q),
    queryFn: () => api.searchData(q),
    enabled: enabled && !!q,
  });
}

// ==================== Xujie Skill Hooks ====================

/** Skill 元数据 */
export function useXujieSkills() {
  return useQuery({ queryKey: qk.xujie.skills, queryFn: () => api.xujie.getSkills() });
}

/** 角色列表 */
export function useCharacters() {
  return useQuery({ queryKey: qk.xujie.characters, queryFn: () => api.xujie.getCharacters() });
}

/** 角色详情 */
export function useCharacter(name, enabled = true) {
  return useQuery({
    queryKey: qk.xujie.character(name),
    queryFn: () => api.xujie.getCharacter(name),
    enabled: !!name && enabled,
  });
}

/** 角色主时间线 */
export function useCharacterTimeline(name, enabled = true) {
  return useQuery({
    queryKey: qk.xujie.characterTimeline(name),
    queryFn: () => api.xujie.getCharacterTimeline(name),
    enabled: !!name && enabled,
  });
}

/** 保存角色 */
export function useSaveCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, title, content }) => api.xujie.saveCharacter(name, title, content),
    onSuccess: (_d, { name }) => {
      qc.invalidateQueries({ queryKey: qk.xujie.characters });
      qc.invalidateQueries({ queryKey: qk.xujie.character(name) });
    },
  });
}

/** 大纲 */
export function useOutline() {
  return useQuery({ queryKey: qk.xujie.outline, queryFn: () => api.xujie.getOutline() });
}

/** 保存大纲 */
export function useSaveOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ outline, plan }) => api.xujie.saveOutline(outline, plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.xujie.outline }),
  });
}

/** 章节树 */
export function useChapters(refetchInterval = 15000) {
  return useQuery({ queryKey: qk.xujie.chapters, queryFn: () => api.xujie.getChapters(), refetchInterval });
}

/** 章节正文 */
export function useChapter(file, enabled = true) {
  return useQuery({
    queryKey: qk.xujie.chapter(file),
    queryFn: () => api.xujie.getChapter(file),
    enabled: !!file && enabled,
  });
}

/** 思想笔记列表 */
export function useNotes() {
  return useQuery({ queryKey: qk.xujie.notes, queryFn: () => api.xujie.getNotes() });
}

/** 保存思想笔记 */
export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, title, content, tags }) => api.xujie.saveNote(name, title, content, tags),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.xujie.notes }),
  });
}

/** 删除思想笔记 */
export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => api.xujie.deleteNote(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.xujie.notes }),
  });
}

/** 素材：benchmarks / worldbuilding / tracking */
export function useBenchmarks() {
  return useQuery({ queryKey: qk.xujie.benchmarks, queryFn: () => api.xujie.getBenchmarks() });
}
export function useWorldbuilding() {
  return useQuery({ queryKey: qk.xujie.worldbuilding, queryFn: () => api.xujie.getWorldbuilding() });
}
export function useTracking() {
  return useQuery({ queryKey: qk.xujie.tracking, queryFn: () => api.xujie.getTracking() });
}

/** 章节修改意见 */
export function useFeedback(chapter) {
  return useQuery({
    queryKey: qk.xujie.feedback(chapter),
    queryFn: () => api.xujie.getFeedback(chapter),
    refetchInterval: 10000,
  });
}

/** 提交修改意见 */
export function useAddFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chapter, content, dimension }) => api.xujie.addFeedback(chapter, content, dimension),
    onSuccess: (_d, { chapter }) => {
      qc.invalidateQueries({ queryKey: qk.xujie.feedback(chapter) });
      qc.invalidateQueries({ queryKey: qk.xujie.feedback('all') });
    },
  });
}

/** 意见状态流转 */
export function useSetFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.xujie.setFeedbackStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.xujie.feedback });
    },
  });
}

/** 蝴蝶效应影响分析 */
export function useImpact(q, enabled = false) {
  return useQuery({
    queryKey: qk.xujie.impact(q),
    queryFn: () => api.xujie.getImpact(q),
    enabled: enabled && !!q,
  });
}

/** 创建任务 */
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

/** 执行/取消/重试任务 */
export function useTaskAction(action) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api[action](id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tasks });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}
