import 'server-only';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { getSiteSettings } from './public-data';

type PageKey = 'income' | 'expense' | 'shop' | 'donations' | 'ramadan' | 'fitrah' | 'projects' | 'gallery';

const pathByPageKey: Record<PageKey, string> = {
  income: '/income',
  expense: '/expense',
  shop: '/shop',
  donations: '/donations',
  ramadan: '/ramadan',
  fitrah: '/fitrah',
  projects: '/projects',
  gallery: '/gallery'
};

async function getMetadataLocale() {
  const localeCookie = (await cookies()).get('NEXT_LOCALE')?.value;
  return localeCookie === 'ur' ? 'ur' : 'en';
}

export async function buildPageMetadata(pageKey: PageKey): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'pages' }),
    getSiteSettings()
  ]);

  const title = `${t(`${pageKey}.title`)} | ${settings.masjidName}`;
  const description = t(`${pageKey}.subtitle`);
  const path = pathByPageKey[pageKey];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: settings.masjidName,
      locale,
      type: 'website'
    }
  };
}

export async function buildHomeMetadata(): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    getSiteSettings()
  ]);

  const title = settings.masjidName;
  const description = t('subtitle');

  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      url: '/',
      siteName: settings.masjidName,
      locale,
      type: 'website'
    }
  };
}
