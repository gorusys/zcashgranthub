export const ZCG_FORUM_CATEGORY_ID = 33;

export interface CommunityGrantsForumTopic {
  id: number;
  title: string;
  slug: string;
  href: string;
  categoryId: number | null;
  categoryName: string | null;
  subcategoryLabel: string | null;
  postsCount: number;
  lastPostedAt: string | null;
}

export interface CommunityGrantsForumTopicsPayload {
  topics: CommunityGrantsForumTopic[];
  page: number;
  hasMore: boolean;
}
