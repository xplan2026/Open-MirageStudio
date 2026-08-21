import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  QrCode,
  RefreshCw,
  Loader2,
  CircleCheck,
  CircleAlert,
  CircleDashed,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const QR_STATUS_TEXT = {
  wait: '等待微信扫码…',
  scaned: '已扫码，请在手机上确认登录',
  confirmed: '绑定成功，正在启动通道…',
  expired: '二维码已过期，请重新获取',
};

function QrStatusBadge({ status }) {
  if (!status) return null;
  const text = QR_STATUS_TEXT[status] || status;
  const variant =
    status === 'confirmed'
      ? 'success'
      : status === 'expired'
        ? 'destructive'
        : status === 'scaned'
          ? 'info'
          : 'warning';
  return <Badge variant={variant}>{text}</Badge>;
}

export default function WeChat() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.wechat.getStatus();
      setStatus(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 页面打开期间每 2s 轮询一次状态（扫码/绑定/在线 变化实时反映）
  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 2000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const getQrcode = async () => {
    setQrLoading(true);
    setError('');
    try {
      const data = await api.wechat.getQrcode();
      setStatus((s) => ({
        ...s,
        qrcodeContent: data.qrcodeContent,
        qrcodeStatus: data.qrcodeStatus,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const bound = status?.bound;
  const running = status?.running;
  const qrcodeContent = status?.qrcodeContent;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">微信对话</h1>
          <p className="text-sm text-muted-foreground">
            通过 iLink-bot 接入微信，扫码绑定管理员微信后即可远程对话
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 通道状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            通道状态
          </CardTitle>
          <CardDescription>微信 iLink 通道的运行情况</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-xs text-muted-foreground">绑定状态</div>
                <div className="mt-1 flex items-center gap-2">
                  {bound ? (
                    <>
                      <CircleCheck className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold">已绑定</span>
                    </>
                  ) : (
                    <>
                      <CircleDashed className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">未绑定</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-xs text-muted-foreground">通道运行</div>
                <div className="mt-1 flex items-center gap-2">
                  {running ? (
                    <>
                      <CircleCheck className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold">在线</span>
                    </>
                  ) : (
                    <>
                      <CircleDashed className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">{bound ? '待启动' : '待绑定'}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-xs text-muted-foreground">机器人 ID</div>
                <div className="mt-1 truncate font-mono text-sm">{status?.botId || '—'}</div>
              </div>
              {status?.lastError && (
                <div className="sm:col-span-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                  最近错误：{status.lastError}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 二维码绑定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            {bound ? '安全状态' : '扫码绑定'}
          </CardTitle>
          <CardDescription>
            {bound
              ? '已绑定管理员微信，禁止再次扫码（防止他人顶号）'
              : '使用管理员微信扫描二维码，登录后自动完成绑定'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bound ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">微信通道已绑定且受保护</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  仅绑定的管理员微信可触发任务；非管理员消息将被直接忽略。如需更换绑定微信，请手动清除服务器
                  <code className="mx-1 rounded bg-muted px-1">.env</code> 中的
                  <code className="mx-1 rounded bg-muted px-1">WECHAT_ADMIN_ID</code>
                  后重启服务。
                </p>
              </div>
            </div>
          ) : qrcodeContent ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-4">
                <QRCode value={qrcodeContent} size={224} />
              </div>
              <QrStatusBadge status={status?.qrcodeStatus} />
              <Button
                variant="outline"
                size="sm"
                onClick={getQrcode}
                disabled={qrLoading}
              >
                {qrLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                刷新二维码
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full',
                  'bg-muted text-muted-foreground',
                )}
              >
                <QrCode className="h-7 w-7" />
              </div>
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                点击下方按钮生成微信登录二维码，使用<strong>管理员本人微信</strong>扫码完成绑定。
              </p>
              <Button onClick={getQrcode} disabled={qrLoading}>
                {qrLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                获取登录二维码
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
