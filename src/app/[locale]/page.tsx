import { getTranslations } from 'next-intl/server';
import { getGallery, getProjects, getSiteSettings, getSummaryMetrics, getTodayPrayerTimes } from '@/lib/public-data';
import { Link } from '@/navigation';
import { formatPrayerTimeParts } from '@/lib/prayer-activity';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PrayerMarquee } from '@/components/prayer-marquee';
import { HeroSlider } from '@/components/hero-slider';
import { PrayerBox } from '@/components/prayer-box';
import { StaffAttendanceSection } from '@/components/staff-attendance-section';
import { NavGrid } from '@/components/nav-grid';
import { SummaryMetrics } from '@/components/summary-metrics';
import { ProjectCards } from '@/components/project-cards';
import { MasonryGallery } from '@/components/masonry-gallery';
import { AutoRefresh } from '@/components/auto-refresh';

type SummaryMetricsData = {
  totalIncome: number;
  yearlyExpense: number;
  totalDonation: number;
  activeProjects: number;
  totalShop?: number;
  totalFitrah?: number;
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: 'en' | 'ur' = locale === 'ur' ? 'ur' : 'en';
  const appTimeZone = process.env.APP_TIME_ZONE || 'Asia/Karachi';

  const [settings, prayers, metrics, projects, gallery, tCommon, tNav, tHome, tMetrics] = await Promise.all([
    getSiteSettings(),
    getTodayPrayerTimes(),
    getSummaryMetrics(),
    getProjects(),
    getGallery(),
    getTranslations({ locale: resolvedLocale, namespace: 'common' }),
    getTranslations({ locale: resolvedLocale, namespace: 'nav' }),
    getTranslations({ locale: resolvedLocale, namespace: 'home' }),
    getTranslations({ locale: resolvedLocale, namespace: 'metrics' })
  ]);

  const prayerLabels = resolvedLocale === 'ur'
    ? {
      fajr: 'فجر',
      zohar: 'ظہر',
      asr: 'عصر',
      maghrib: 'مغرب',
      isha: 'عشاء',
      juma: 'جمعہ'
    }
    : {
      fajr: 'Fajr',
      zohar: 'Zohar',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      juma: 'Juma'
    };

  const prayerValues = prayers as Record<string, unknown>;
  const getPrayerTime = (key: string) => formatPrayerTimeParts(String(prayerValues[key] ?? ''));

  const prayerItems = [
    { key: 'fajr', label: prayerLabels.fajr, time: getPrayerTime('fajr').time, period: getPrayerTime('fajr').period },
    { key: 'zohar', label: prayerLabels.zohar, time: getPrayerTime('zohar').time, period: getPrayerTime('zohar').period },
    { key: 'asr', label: prayerLabels.asr, time: getPrayerTime('asr').time, period: getPrayerTime('asr').period },
    { key: 'maghrib', label: prayerLabels.maghrib, time: getPrayerTime('maghrib').time, period: getPrayerTime('maghrib').period },
    { key: 'isha', label: prayerLabels.isha, time: getPrayerTime('isha').time, period: getPrayerTime('isha').period },
    { key: 'juma', label: prayerLabels.juma, time: getPrayerTime('juma').time, period: getPrayerTime('juma').period }
  ];

  const labels = {
    income: tNav('income'),
    expense: tNav('expense'),
    shop: tNav('shop'),
    donation: tNav('donation'),
    fitrah: tNav('fitrah'),
    project: tNav('project'),
    gallery: tNav('gallery')
  };

  const counts = {
    income: String((metrics as SummaryMetricsData).totalIncome),
    expense: String((metrics as SummaryMetricsData).yearlyExpense),
    shop: String((metrics as SummaryMetricsData).totalShop ?? 0),
    donation: String((metrics as SummaryMetricsData).totalDonation),
    fitrah: String((metrics as SummaryMetricsData).totalFitrah ?? 0),
    project: String(projects.length),
    gallery: String(gallery.length)
  };

  const projectPreview = (projects as unknown as Array<{ title: string; description: string; status: string; imageUrl?: string; collectedAmount?: number; targetAmount?: number }>).slice(0, 3);
  const galleryPreview = (gallery as unknown as Array<{ mediaType: 'image' | 'video'; url: string; thumbnailUrl?: string; title: string; caption?: string }>).slice(0, 3);

  const galleryHeroSlides = (gallery as Array<{ mediaType?: string; url?: string; title?: string; caption?: string; order?: number }>)
    .filter((item) => item.mediaType === 'image' && Boolean(item.url))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((item) => ({
      title: item.title || tHome('recentMedia'),
      subtitle: item.caption || settings.madrasaName,
      imageUrl: String(item.url),
      linkUrl: '/gallery'
    }));

  return (
    <main>
      <AutoRefresh />
      <SiteHeader phone={settings.phone} masjidName={settings.masjidName} />
     
      <PrayerMarquee text={settings.prayerMarquee || tHome('marquee')} locale={resolvedLocale} items={prayerItems} />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1.7fr_0.95fr] lg:px-6">
        <HeroSlider slides={galleryHeroSlides as never} />
        <PrayerBox prayers={prayers as Record<string, string>} timeZone={appTimeZone} />
      </section>

      <StaffAttendanceSection locale={resolvedLocale} />

      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
        <SummaryMetrics
          metrics={metrics}
          labels={{
            totalIncome: tMetrics('totalIncome'),
            totalDonation: tMetrics('totalDonation'),
            activeProjects: tMetrics('activeProjects'),
            yearlyExpense: tMetrics('yearlyExpense')
          }}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">{tHome('navigation')}</p>
            <h2 className="mt-2 text-3xl font-black">{settings.masjidName}</h2>
          </div>
        </div>
        <NavGrid labels={labels} counts={counts} showMoreLabel={tCommon('showMore')} />
      </section>

    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">{tHome('projectsHeading')}</p>
      <h2 className="mt-2 text-3xl font-black">{tHome('activeProjectsHeading')}</h2>
    </div>
    <Link href="/projects" className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-slate-900">
      {tHome('viewAll')}
    </Link>
  </div>
  <ProjectCards projects={projectPreview as never} />
</section>

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">{tHome('galleryHeading')}</p>
            <h2 className="mt-2 text-3xl font-black">{tHome('recentMedia')}</h2>
          </div>
          <Link href="/gallery" className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-slate-900">
            {tHome('viewAll')}
          </Link>
        </div>
        <MasonryGallery items={galleryPreview as never} />
      </section>

      <SiteFooter address={settings.address} phone={settings.phone} masjidName={settings.masjidName} />
    </main>
  );
}
