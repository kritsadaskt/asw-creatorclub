import { Link } from 'react-router-dom';
import { CampaignLayout } from '../layout/CampaignLayout';

export function AffiliatePage() {
  return (
    <CampaignLayout>
      <div className="max-w-2xl mx-auto px-6 py-12 bg-white rounded-2xl shadow-xl">
        <h1 className="text-3xl font-semibold mb-4 text-primary">
          Affiliate
        </h1>
        <p className="text-muted-foreground mb-4">
          หน้าสำหรับแคมเปญ Affiliate จะถูกออกแบบและพัฒนาต่อจากหน้านี้
        </p>
        <Link to="/creatorclub" title="Back to Creator Club" className="text-primary hover:underline">
          Back to Creator Club
        </Link>
      </div>
    </CampaignLayout>
  );
}

