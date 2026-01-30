// Facebook SDK TypeScript Definitions

interface FacebookAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
}

interface FacebookLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse: FacebookAuthResponse | null;
}

interface FacebookLoginResponse {
  authResponse: FacebookAuthResponse | null;
  status: 'connected' | 'not_authorized' | 'unknown';
}

interface FacebookUserPicture {
  data: {
    height: number;
    is_silhouette: boolean;
    url: string;
    width: number;
  };
}

interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture?: FacebookUserPicture;
}

interface FacebookLoginOptions {
  scope?: string;
  return_scopes?: boolean;
  enable_profile_selector?: boolean;
  auth_type?: 'rerequest' | 'reauthenticate' | 'reauthorize';
}

interface FacebookInitParams {
  appId: string;
  cookie?: boolean;
  xfbml?: boolean;
  version: string;
}

interface FacebookSDK {
  init(params: FacebookInitParams): void;
  login(callback: (response: FacebookLoginResponse) => void, options?: FacebookLoginOptions): void;
  logout(callback: (response: unknown) => void): void;
  getLoginStatus(callback: (response: FacebookLoginStatusResponse) => void): void;
  api(path: string, params: Record<string, unknown>, callback: (response: FacebookUser) => void): void;
  api(path: string, callback: (response: FacebookUser) => void): void;
}

declare global {
  interface Window {
    FB: FacebookSDK;
    fbAsyncInit: () => void;
  }
}

export type {
  FacebookAuthResponse,
  FacebookLoginStatusResponse,
  FacebookLoginResponse,
  FacebookUser,
  FacebookUserPicture,
  FacebookLoginOptions,
  FacebookInitParams,
  FacebookSDK,
};
