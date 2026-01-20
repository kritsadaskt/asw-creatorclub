import { useState, useEffect } from 'react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { AffiliateLink } from '../../types';
import { saveAffiliateLink, getAffiliateLinksByKOL } from '../../utils/storage';

interface AffiliateGeneratorProps {
  kolId: string;
  onNavigate: (view: 'profile' | 'affiliate') => void;
}

export function AffiliateGenerator({ kolId, onNavigate }: AffiliateGeneratorProps) {
  const [campaignName, setCampaignName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, [kolId]);

  const loadLinks = () => {
    const kolLinks = getAffiliateLinksByKOL(kolId);
    setLinks(kolLinks);
  };

  const generateLink = () => {
    if (!campaignName || !baseUrl) return;

    const affiliateCode = `${kolId}_${Date.now()}`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const generatedUrl = `${baseUrl}${separator}ref=${affiliateCode}`;

    const newLink: AffiliateLink = {
      id: `aff_${Date.now()}`,
      kolId,
      campaignName,
      url: generatedUrl,
      createdAt: new Date().toISOString()
    };

    saveAffiliateLink(newLink);
    loadLinks();
    setCampaignName('');
    setBaseUrl('');
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2>สร้าง Affiliate Link</h2>
        <Button onClick={() => onNavigate('profile')} variant="outline">
          กลับไปโปรไฟล์
        </Button>
      </div>

      {/* Generator Form */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
        <h3 className="text-primary mb-4">สร้างลิงก์ใหม่</h3>
        
        <div className="space-y-4">
          <Input
            label="ชื่อแคมเปญ"
            value={campaignName}
            onChange={setCampaignName}
            placeholder="เช่น โปรโมชั่นสินค้า A"
            required
          />

          <Input
            label="URL ปลายทาง"
            value={baseUrl}
            onChange={setBaseUrl}
            placeholder="https://example.com/product"
            required
          />

          <Button onClick={generateLink} fullWidth>
            สร้างลิงก์
          </Button>
        </div>
      </div>

      {/* Links List */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-primary mb-4">ลิงก์ของฉัน ({links.length})</h3>
        
        {links.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ยังไม่มีลิงก์ สร้างลิงก์แรกของคุณเลย!
          </p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="p-4 bg-muted/30 rounded-lg border border-border"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="text-foreground mb-1">{link.campaignName}</h4>
                    <p className="text-sm text-muted-foreground break-all">
                      {link.url}
                    </p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(link.url, link.id)}
                    variant="outline"
                  >
                    {copiedId === link.id ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  สร้างเมื่อ: {new Date(link.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
