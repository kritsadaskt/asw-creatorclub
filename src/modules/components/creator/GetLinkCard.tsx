'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Copy, Check, Link2, Loader2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/publicPath';

interface GetLinkCardProps {
  creatorId: string;
}

export function GetLinkCard({ creatorId }: GetLinkCardProps) {
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const fallbackUrl = `https://assetwise.co.th/creatorclub/?ref=${creatorId}`;

  useEffect(() => {
    const fetchShortUrl = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(`${BASE_PATH}/api/affiliate/shorten`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatorId }),
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        setShortUrl(data.shortUrl);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchShortUrl();
  }, [creatorId]);

  const handleCopy = () => {
    const urlToCopy = shortUrl ?? fallbackUrl;
    navigator.clipboard
      .writeText(urlToCopy)
      .then(() => {
        setCopied(true);
        toast.success('คัดลอกลิงก์แล้ว!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('ไม่สามารถคัดลอกได้'));
  };

  const displayUrl = shortUrl ?? (error ? fallbackUrl : null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">ลิงก์แนะนำของคุณ</h3>
      </div>

      {error && (
        <p className="text-xs text-amber-600">
          ไม่สามารถสร้างลิงก์สั้นได้ — แสดงลิงก์เต็มแทน
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">กำลังสร้างลิงก์...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/40 rounded-lg px-4 py-2.5 text-sm text-foreground font-mono truncate select-all border border-border">
            {displayUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!displayUrl}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                คัดลอกแล้ว ✓
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                คัดลอกลิงก์
              </>
            )}
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        แชร์ลิงก์นี้เพื่อแนะนำเพื่อนของคุณ — คุณจะได้รับเครดิตทุกครั้งที่มีคนลงทะเบียนผ่านลิงก์นี้
      </p>
    </div>
  );
}
