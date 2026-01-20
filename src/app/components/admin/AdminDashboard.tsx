import { useState, useEffect } from 'react';
import { Button } from '../shared/Button';
import { KOLProfile } from '../../types';
import { getKOLs } from '../../utils/storage';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LayoutGrid, Table } from 'lucide-react';

const CATEGORIES = [
  'ทั้งหมด',
  'แฟชั่น',
  'ความงาม',
  'อาหาร',
  'ท่องเที่ยว',
  'เทคโนโลยี',
  'ไลฟ์สไตล์',
  'กีฬา',
  'เกม',
  'อื่นๆ'
];

export function AdminDashboard() {
  const [kols, setKols] = useState<KOLProfile[]>([]);
  const [filteredKols, setFilteredKols] = useState<KOLProfile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [selectedKOL, setSelectedKOL] = useState<KOLProfile | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [followerRange, setFollowerRange] = useState('all');
  const [customFollowers, setCustomFollowers] = useState('');

  useEffect(() => {
    loadKOLs();
  }, []);

  useEffect(() => {
    filterKOLs();
  }, [kols, selectedCategory, searchQuery, followerRange, customFollowers]);

  const loadKOLs = () => {
    const allKOLs = getKOLs();
    setKols(allKOLs);
  };

  const filterKOLs = () => {
    let filtered = [...kols];

    // Category filter
    if (selectedCategory !== 'ทั้งหมด') {
      filtered = filtered.filter(kol => kol.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(kol =>
        kol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kol.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Followers filter
    if (followerRange === 'custom' && customFollowers) {
      const min = parseInt(customFollowers);
      filtered = filtered.filter(kol => kol.followers >= min);
    } else if (followerRange !== 'all') {
      const ranges: { [key: string]: { min: number; max?: number } } = {
        '0-1k': { min: 0, max: 1000 },
        '1k-10k': { min: 1000, max: 10000 },
        '10k-50k': { min: 10000, max: 50000 },
        '50k-100k': { min: 50000, max: 100000 },
        '100k-500k': { min: 100000, max: 500000 },
        '500k+': { min: 500000 }
      };
      
      const range = ranges[followerRange];
      if (range) {
        filtered = filtered.filter(kol => {
          const followers = kol.followers;
          if (range.max) {
            return followers >= range.min && followers < range.max;
          }
          return followers >= range.min;
        });
      }
    }

    setFilteredKols(filtered);
  };

  const getSocialLinks = (kol: KOLProfile) => {
    const links = [];
    if (kol.socialAccounts.facebook) links.push({ name: 'Facebook', url: kol.socialAccounts.facebook });
    if (kol.socialAccounts.instagram) links.push({ name: 'Instagram', url: kol.socialAccounts.instagram });
    if (kol.socialAccounts.tiktok) links.push({ name: 'TikTok', url: kol.socialAccounts.tiktok });
    if (kol.socialAccounts.youtube) links.push({ name: 'YouTube', url: kol.socialAccounts.youtube });
    if (kol.socialAccounts.twitter) links.push({ name: 'Twitter', url: kol.socialAccounts.twitter });
    return links;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="mb-6">แดชบอร์ดจัดการ KOL</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
        <h3 className="text-primary mb-4">ค้นหาและกรองข้อมูล</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label>ค้นหา (ชื่อ / อีเมล)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา..."
              className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>หมวดหมู่</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label>ผู้ติดตาม (follower)</label>
            <select
              value={followerRange}
              onChange={(e) => {
                setFollowerRange(e.target.value);
                if (e.target.value !== 'custom') {
                  setCustomFollowers('');
                }
              }}
              className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">ทั้งหมด</option>
              <option value="0-1k">0 - 1,000</option>
              <option value="1k-10k">1,000 - 10,000</option>
              <option value="10k-50k">10,000 - 50,000</option>
              <option value="50k-100k">50,000 - 100,000</option>
              <option value="100k-500k">100,000 - 500,000</option>
              <option value="500k+">500,000+</option>
              <option value="custom">กำหนดเอง</option>
            </select>
          </div>
        </div>

        {/* Custom Followers Input */}
        {followerRange === 'custom' && (
          <div className="mt-4">
            <div className="flex flex-col gap-1.5 max-w-xs">
              <label>จำนวนผู้ติดตามขั้นต่ำ</label>
              <input
                type="number"
                value={customFollowers}
                onChange={(e) => setCustomFollowers(e.target.value)}
                placeholder="กรอกจำนวนผู้ติดตาม..."
                className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-primary">
            KOL ทั้งหมด ({filteredKols.length})
          </h3>
          
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card'
                  ? 'bg-primary text-white'
                  : 'bg-input-background text-muted-foreground hover:bg-border'
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'bg-input-background text-muted-foreground hover:bg-border'
              }`}
              title="มุมมองตาราง"
            >
              <Table size={20} />
            </button>
          </div>
        </div>

        {filteredKols.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ไม่พบข้อมูล KOL
          </p>
        ) : viewMode === 'card' ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKols.map((kol) => (
              <div
                key={kol.id}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors flex flex-col"
              >
                {/* Profile Image */}
                <div className="flex justify-center mb-4">
                  {kol.profileImage ? (
                    <ImageWithFallback
                      src={kol.profileImage}
                      alt={kol.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                      <span className="text-primary text-2xl">
                        {kol.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-center mb-4">
                  <h4 className="text-foreground mb-1">{kol.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">{kol.email}</p>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm mb-4 flex-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">หมวดหมู่:</span>
                    <span className="text-foreground">{kol.category || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ผู้ติดตาม:</span>
                    <span className="text-foreground">{kol.followers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">โซเชียล:</span>
                    <span className="text-foreground">{getSocialLinks(kol).length} ช่องทาง</span>
                  </div>
                </div>

                {/* Button */}
                <Button
                  onClick={() => setSelectedKOL(kol)}
                  variant="outline"
                  fullWidth
                >
                  ดูรายละเอียด
                </Button>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">รูป</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ชื่อ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">อีเมล</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">หมวดหมู่</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ผู้ติดตาม</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โทรศัพท์</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โซเชียล</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredKols.map((kol) => (
                  <tr key={kol.id} className="border-b border-border hover:bg-input-background/30 transition-colors">
                    <td className="py-3 px-4">
                      {kol.profileImage ? (
                        <ImageWithFallback
                          src={kol.profileImage}
                          alt={kol.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                          <span className="text-primary text-sm">
                            {kol.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">{kol.name}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{kol.email}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{kol.category || '-'}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{kol.followers.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{kol.phone || '-'}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{getSocialLinks(kol).length} ช่องทาง</td>
                    <td className="py-3 px-4">
                      <Button
                        onClick={() => setSelectedKOL(kol)}
                        variant="outline"
                        size="sm"
                      >
                        ดูรายละเอียด
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedKOL && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedKOL(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-primary">รายละเอียด KOL</h3>
              <button
                onClick={() => setSelectedKOL(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Profile Image in Modal */}
            <div className="flex justify-center mb-6">
              {selectedKOL.profileImage ? (
                <ImageWithFallback
                  src={selectedKOL.profileImage}
                  alt={selectedKOL.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                  <span className="text-primary text-5xl">
                    {selectedKOL.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-muted-foreground">ชื่อ-นามสกุล</label>
                <p className="text-foreground">{selectedKOL.name}</p>
              </div>

              <div>
                <label className="text-muted-foreground">อีเมล</label>
                <p className="text-foreground">{selectedKOL.email}</p>
              </div>

              <div>
                <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
                <p className="text-foreground">{selectedKOL.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground">หมวดหมู่</label>
                  <p className="text-foreground">{selectedKOL.category || '-'}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">ผู้ติดตาม</label>
                  <p className="text-foreground">{selectedKOL.followers.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground">บัญชีโซเชียลมีเดีย</label>
                <div className="mt-2 space-y-2">
                  {getSocialLinks(selectedKOL).map((social, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground w-24">{social.name}:</span>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {social.url}
                      </a>
                    </div>
                  ))}
                  {getSocialLinks(selectedKOL).length === 0 && (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-muted-foreground">วันที่ลงทะเบียน</label>
                <p className="text-foreground">
                  {new Date(selectedKOL.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => window.location.href = `mailto:${selectedKOL.email}`}
                fullWidth
              >
                ส่งอีเมล
              </Button>
              <Button
                onClick={() => window.location.href = `tel:${selectedKOL.phone}`}
                variant="outline"
                fullWidth
              >
                โทรออก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}