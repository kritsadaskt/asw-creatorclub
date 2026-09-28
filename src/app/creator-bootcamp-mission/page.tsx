import { redirect } from 'next/navigation';

/** Temporary: send Creators Bootcamp mission traffic to the homepage. Restore from README.md. */
export default function CreatorBootcampMissionRoutePage() {
  redirect('/');
}
