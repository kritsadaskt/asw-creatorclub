import type { Metadata } from 'next';
import { EventPage } from '@/modules/components/event/EventPage';
import { stripHtmlTags } from '@/modules/utils/strip-html-tags';
import { getCurrentEvent } from '@/modules/utils/storage';

const DEFAULT_TITLE = 'AssetWise Creator Club';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const event = await getCurrentEvent();
    if (!event?.name?.trim()) {
      return { title: DEFAULT_TITLE };
    }
    const title = stripHtmlTags(event.name) || DEFAULT_TITLE;
    return {
      title: { absolute: title },
      openGraph: { title },
    };
  } catch {
    return { title: DEFAULT_TITLE };
  }
}

export default function EventRoutePage() {
  return <EventPage />;
}
