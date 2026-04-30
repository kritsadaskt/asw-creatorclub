import { CampaignAffiliatePage } from '@/modules/components/affiliate/AffiliatePage';

type CampaignPageProps = {
  params: Promise<{ campaignKey: string }>;
};

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { campaignKey } = await params;
  return <CampaignAffiliatePage campaignKey={campaignKey} />;
}
