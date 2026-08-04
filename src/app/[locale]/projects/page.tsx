import { getProjects, getSiteSettings } from '@/lib/public-data';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ProjectCards } from '@/components/project-cards';
import { getTranslations } from 'next-intl/server';
import { AutoRefresh } from '@/components/auto-refresh';

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale = locale as 'en' | 'ur';
  const [settings, projects, t] = await Promise.all([getSiteSettings(), getProjects(), getTranslations({ locale: resolvedLocale, namespace: 'pages' })]);

  return (
    <main>
      <AutoRefresh />
      <SiteHeader phone={settings.phone} masjidName={settings.masjidName} />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <h1 className="text-4xl font-black">{t('projects.title')}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t('projects.subtitle')}</p>
        <div className="mt-8">
          <ProjectCards projects={projects as never} />
        </div>
      </section>
      <SiteFooter address={settings.address} phone={settings.phone} />
    </main>
  );
}
