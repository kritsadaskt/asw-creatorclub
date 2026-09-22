import type { Metadata } from 'next';
import { CreatorBootupMissionPage } from '@/modules/components/event/CreatorBootupMissionPage';

export const metadata: Metadata = {
  title: 'Creators Bootcamp Mission',
};

export default function CreatorBootupMissionRoutePage() {
  return <CreatorBootupMissionPage />;
}
