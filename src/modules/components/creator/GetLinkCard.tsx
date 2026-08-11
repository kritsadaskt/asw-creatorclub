'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Copy, Check, Link2, Loader2 } from 'lucide-react';
import { isAffiliateGetLinkEnabled } from '@/lib/affiliate-get-link';
import { BASE_PATH } from '@/lib/publicPath';

interface GetLinkCardProps {
  creatorId: string;
}

export function GetLinkCard({ creatorId }: GetLinkCardProps) {
  const getLinkEnabled = isAffiliateGetLinkEnabled();
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(getLinkEnabled);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getLinkEnabled) {
      setLoading(false);
      setShortUrl(null);
      return;
    }

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
        if (typeof data.shortUrl !== 'string' || !data.shortUrl.trim()) {
          throw new Error('Missing shortUrl');
        }
        setShortUrl(data.shortUrl);
      } catch {
        setError(true);
        setShortUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchShortUrl();
  }, [creatorId, getLinkEnabled]);

  if (!getLinkEnabled) return null;

  const handleCopy = () => {
    if (!shortUrl) return;
    navigator.clipboard
      .writeText(shortUrl)
      .then(() => {
        setCopied(true);
        toast.success('คัดลอกลิงก์แล้ว!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('ไม่สามารถคัดลอกได้'));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">ลิงก์แนะนำของคุณ</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">กำลังสร้างลิงก์...</span>
        </div>
      ) : error || !shortUrl ? (
        <p className="text-sm text-destructive">เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง</p>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/40 rounded-lg px-4 py-2.5 text-sm text-foreground font-mono truncate select-all border border-border">
            {shortUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
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
    </div>
  );
}
