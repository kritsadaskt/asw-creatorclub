import type { Metadata } from 'next';
import { EventPage } from '@/modules/components/event/EventPage';
import { stripHtmlTags } from '@/modules/utils/strip-html-tags';
import { normalizeEventSlugParam } from '@/modules/utils/event-slug';
import { getCurrentEvent, getEventBySlug } from '@/modules/utils/storage';

const DEFAULT_TITLE = 'AssetWise Creator Club';

type EventRoutePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateMetadata({ params }: EventRoutePageProps): Promise<Metadata> {
  try {
    const slug = normalizeEventSlugParam((await params).slug);
    const event = slug ? await getEventBySlug(slug) : await getCurrentEvent();
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
