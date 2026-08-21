import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Login() {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | waiting | expired | error
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const tokenRef = useRef(null);
  const pollTimerRef = useRef(null);

  const startLogin = async () => {
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/auth/qrcode');
      if (!res.ok) throw new Error('获取 QR 码失败');
      const data = await res.json();

      tokenRef.current = data.token;
      setQrCode(data.qrcode);
      setStatus('waiting');
      pollStatus(data.token);
    } catch (err) {
      setError('无法连接到认证服务');
      setStatus('error');
    }
  };

  const pollStatus = (token) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/auth/status?token=${token}`);
        const data = await res.json();

        if (data.status === 'confirmed') {
          clearInterval(pollTimerRef.current);
          localStorage.setItem('coordinator_jwt', data.jwt);
          navigate('/');
        } else if (data.status === 'expired') {
          clearInterval(pollTimerRef.current);
          setStatus('expired');
        }
      } catch {
        // 网络错误静默重试
      }
    }, 2000);
  };

  useEffect(() => {
    startLogin();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-indigo-950/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Mirage Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">大副工作台 · 扫码登录</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center p-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-sm text-muted-foreground">正在生成登录二维码…</p>
              </div>
            )}

            {status === 'waiting' && qrCode && (
              <div className="flex w-full flex-col items-center gap-3">
                <img
                  src={qrCode}
                  alt="登录二维码"
                  className="aspect-square w-56 rounded-xl border bg-white p-2"
                />
                <div className="flex flex-col items-center gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-muted-foreground">请使用手机相机或浏览器扫码</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70">微信扫码会被拦截，请使用手机自带相机或浏览器</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  等待扫码确认…
                </div>
              </div>
            )}

            {status === 'expired' && (
              <div className="flex w-full flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">二维码已过期</p>
                <Button onClick={startLogin}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  刷新二维码
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex w-full flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-destructive">{error || '认证服务异常'}</p>
                <Button onClick={startLogin}>重试</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
