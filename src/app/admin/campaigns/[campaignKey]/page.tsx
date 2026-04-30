import { CampaignEditor } from '@/modules/components/admin/CampaignEditor';

type CampaignEditorPageProps = {
  params: Promise<{ campaignKey: string }>;
};

export default async function CampaignEditorPage({ params }: CampaignEditorPageProps) {
  const { campaignKey } = await params;
  return <CampaignEditor campaignKey={campaignKey} />;
}
