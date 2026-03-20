import type { FacebookLoginResponse, FacebookUser } from '../types/facebook.d.ts';
import { supabase } from './supabase';
import { clearFacebookLocalStorage } from './localStorageSafe';

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? '';
const FACEBOOK_GRAPH_PICTURE_BASE = 'https://graph.facebook.com';
const PROFILE_IMAGES_BUCKET = 'profile-images';

/**
 * Initialize Facebook SDK
 * Should be called once when the app loads
 */
export const initFacebookSDK = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  clearFacebookLocalStorage();

  return new Promise((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });
      resolve();
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
};

/**
 * Login with Facebook
 */
export const loginWithFacebook = (): Promise<FacebookLoginResponse> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized'));
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve(response);
        } else {
          reject(new Error('Facebook login cancelled or failed'));
        }
      },
      { scope: 'email,public_profile' },
    );
  });
};

/**
 * Get Facebook user info
 */
export const getFacebookUserInfo = (): Promise<FacebookUser> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized'));
      return;
    }

    window.FB.api('/me', { fields: 'id,name,email,picture.type(large)' }, (response) => {
      if (response && response.id) {
        resolve(response);
      } else {
        reject(new Error('Failed to get Facebook user info'));
      }
    });
  });
};

/**
 * Logout from Facebook
 */
export const logoutFromFacebook = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve();
      return;
    }

    window.FB.logout(() => {
      resolve();
    });
  });
};

/**
 * Check if user is logged in to Facebook
 */
export const checkFacebookLoginStatus = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve(false);
      return;
    }

    window.FB.getLoginStatus((response) => {
      resolve(response.status === 'connected');
    });
  });
};

/**
 * Fetch the user's Facebook profile image and upload to Supabase Storage.
 */
export async function fetchAndUploadFacebookProfileImage(
  accessToken: string,
  facebookId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${FACEBOOK_GRAPH_PICTURE_BASE}/${facebookId}/picture?type=large`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    const contentType = blob.type || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `${facebookId}.${ext}`;

    const { error } = await supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .upload(path, blob, { contentType, upsert: true });

    if (error) {
      console.warn('Supabase profile image upload failed:', error);
      return null;
    }

    const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('Failed to fetch/upload Facebook profile image:', err);
    return null;
  }
}
