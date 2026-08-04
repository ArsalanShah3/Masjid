import 'server-only';
import { revalidateTag } from 'next/cache';

// Maps an admin resource collection key to the public-data cache tag(s) that
// need to be invalidated whenever an item in that collection is created,
// updated, or deleted. Some collections also feed the homepage summary
// metrics, so those get an extra tag.
const collectionTags: Record<string, string[]> = {
  'prayer-times': ['public-prayer-times'],
  'income-records': ['public-income-records', 'public-summary-metrics'],
  'expense-records': ['public-expense-records', 'public-summary-metrics'],
  'shop-records': ['public-shop-records', 'public-summary-metrics'],
  donations: ['public-donation-records', 'public-summary-metrics'],
  'ramadan-donations': ['public-ramadan-donation-records'],
  'ramadan-expenses': ['public-ramadan-expense-records'],
  'fitrah-records': ['public-fitrah-records', 'public-summary-metrics'],
  projects: ['public-projects', 'public-summary-metrics'],
  gallery: ['public-gallery'],
  'hero-slides': ['public-hero-slides'],
  settings: ['public-site-settings']
};

export function revalidatePublicData(collection: string) {
  const tags = collectionTags[collection];
  if (!tags) return;
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
