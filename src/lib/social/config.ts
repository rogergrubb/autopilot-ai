/**
 * Social platform configuration for Pipedream Connect integration.
 * Each platform defines its Pipedream app slug, action keys, and display info.
 */

export interface SocialPlatform {
  id: string;
  name: string;
  appSlug: string;           // Pipedream app identifier
  icon: string;              // Emoji icon
  color: string;             // Brand color
  postActionKey: string;     // Pipedream action key for creating posts
  description: string;
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    appSlug: 'reddit',
    icon: '🟠',
    color: '#FF4500',
    postActionKey: 'reddit-create-post',
    description: 'Post to subreddits',
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    appSlug: 'twitter',
    icon: '𝕏',
    color: '#000000',
    postActionKey: 'twitter-create-tweet',
    description: 'Post tweets',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Pages',
    appSlug: 'facebook_pages',
    icon: '📘',
    color: '#1877F2',
    postActionKey: 'facebook_pages-create-post',
    description: 'Post to Facebook Pages',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    appSlug: 'linkedin',
    icon: '💼',
    color: '#0A66C2',
    postActionKey: 'linkedin-create-share-update',
    description: 'Post to LinkedIn',
  },
};

export const SUPPORTED_PLATFORMS = Object.keys(SOCIAL_PLATFORMS);
export const EXTERNAL_USER_ID = 'default-user';
