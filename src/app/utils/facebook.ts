import type { FacebookLoginResponse, FacebookUser } from '../types/facebook.d.ts';
import { supabase } from './supabase';
import { clearFacebookLocalStorage } from './localStorageSafe';

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const FACEBOOK_GRAPH_PICTURE_BASE = 'https://graph.facebook.com';
const PROFILE_IMAGES_BUCKET = 'profile-images';

/**
 * Initialize Facebook SDK
 * Should be called once when the app loads
 */
export const initFacebookSDK = (): Promise<void> => {
  clearFacebookLocalStorage();

  return new Promise((resolve) => {
    // If SDK already loaded
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

    // Load SDK script if not already present
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
 * Opens Facebook login popup and returns auth response
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
      { scope: 'email,public_profile' }
    );
  });
};

/**
 * Get Facebook user info
 * Returns user's id, name, email, and profile picture
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
 * Fetch the user's Facebook profile image (using access token) and upload to Supabase Storage.
 * Returns the public URL of the uploaded image, or null on failure.
 * Use this at registration/login so we store our own URL instead of Facebook's (which 404s in <img>).
 *
 * Requires a Supabase Storage bucket named "profile-images" with public read access:
 * - In Supabase Dashboard: Storage → New bucket → name "profile-images" → set Public bucket ON.
 */
export async function fetchAndUploadFacebookProfileImage(
  accessToken: string,
  facebookId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${FACEBOOK_GRAPH_PICTURE_BASE}/${facebookId}/picture?type=large`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
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
