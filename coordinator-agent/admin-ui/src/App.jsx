import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Assets from './pages/Assets';
import AgentXujie from './pages/AgentXujie';
import AgentZhupu from './pages/AgentZhupu';
import AgentLemong from './pages/AgentLemong';
import AgentErhu from './pages/AgentErhu';
import TaskOrchestra from './pages/TaskOrchestra';
import AgentStatus from './pages/AgentStatus';
import Logs from './pages/Logs';
import WeChat from './pages/WeChat';
import Login from './pages/Login';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="wechat" element={<WeChat />} />
        <Route path="assets" element={<Assets />} />
        <Route path="xujie" element={<AgentXujie />} />
        <Route path="zhupu" element={<AgentZhupu />} />
        <Route path="lemong" element={<AgentLemong />} />
        <Route path="erhu" element={<AgentErhu />} />
        <Route path="tasks" element={<TaskOrchestra />} />
        <Route path="agents" element={<AgentStatus />} />
        <Route path="logs" element={<Logs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
