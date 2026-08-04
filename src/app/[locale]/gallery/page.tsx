import { getGallery, getSiteSettings } from '@/lib/public-data';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MasonryGallery } from '@/components/masonry-gallery';
import { getTranslations } from 'next-intl/server';
import { AutoRefresh } from '@/components/auto-refresh';

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale = locale as 'en' | 'ur';
  const [settings, gallery, t] = await Promise.all([getSiteSettings(), getGallery(), getTranslations({ locale: resolvedLocale, namespace: 'pages' })]);

  return (
    <main>
      <AutoRefresh />
      <SiteHeader phone={settings.phone} masjidName={settings.masjidName} />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <h1 className="text-4xl font-black">{t('gallery.title')}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t('gallery.subtitle')}</p>
        <div className="mt-8">
          <MasonryGallery items={gallery as never} />
        </div>
      </section>
      <SiteFooter address={settings.address} phone={settings.phone} />
    </main>
  );
}
