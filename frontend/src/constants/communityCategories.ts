export const COMMUNITY_CATEGORY_CODES = ['sports', 'arts', 'tech', 'social', 'other'] as const;

export type CommunityCategoryCode = (typeof COMMUNITY_CATEGORY_CODES)[number];

export const COMMUNITY_CATEGORY_LABEL_KEYS: Record<CommunityCategoryCode, string> = {
  sports: 'communityCategory.sports',
  arts: 'communityCategory.arts',
  tech: 'communityCategory.tech',
  social: 'communityCategory.social',
  other: 'communityCategory.other',
};

