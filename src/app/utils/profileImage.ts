import type { CreatorProfile } from '../types';

const FACEBOOK_GRAPH_PICTURE_BASE = 'https://graph.facebook.com';

/**
 * Returns true if the URL is a Facebook lookaside/temporary profile picture URL.
 * These URLs expire and often return 404.
 */
export function isFacebookProfileImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('fbsbx.com') || url.includes('platform-lookaside') || url.includes('facebook.com/platform/profilepic')
  );
}

/**
 * Returns the best URL to use for a creator's profile image.
 * For Facebook users with a stored lookaside URL, uses the stable Graph API URL instead.
 */
export function getProfileImageUrl(creator: CreatorProfile): string | undefined {
  const stored = creator.profileImage;
  const hasFacebookId = !!creator.facebookId;

  if (hasFacebookId && isFacebookProfileImageUrl(stored)) {
    return `${FACEBOOK_GRAPH_PICTURE_BASE}/${creator.facebookId}/picture?type=large`;
  }

  return stored;
}
