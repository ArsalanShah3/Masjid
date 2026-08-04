import { getFitrahRecords, getSiteSettings } from '@/lib/public-data';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SectionPage } from '@/components/section-page';
import { getTranslations } from 'next-intl/server';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default async function FitrahPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale = locale as 'en' | 'ur';
  const [settings, t, common, records] = await Promise.all([getSiteSettings(), getTranslations({ locale: resolvedLocale, namespace: 'pages' }), getTranslations({ locale: resolvedLocale, namespace: 'common' }), getFitrahRecords()]);

  const totalMembers = records.reduce((sum: number, item: any) => sum + Number(item.membersCount || 0), 0);
  const totalAmount = records.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

  const rows = records.map((item: any) => ({
    family: String(item.familyName || '-'),
    members: formatNumber(Number(item.membersCount || 0)),
    amount: formatCurrency(Number(item.amount || 0)),
    year: String(item.year || '-')
  }));

  const columns = [common('family'), common('members'), common('amount'), common('year')];

  const normalizedRows = rows.map((item) => ({
    [common('family')]: item.family,
    [common('members')]: item.members,
    [common('amount')]: item.amount,
    [common('year')]: item.year
  }));

  return (
    <>
      <SiteHeader phone={settings.phone} masjidName={settings.masjidName} />
      <SectionPage
        brandLabel={`${common('brandTop')} ${common('brandBottom')}`}
        title={t('fitrah.title')}
        subtitle={t('fitrah.subtitle')}
        summary={[
          { label: common('families'), value: formatNumber(records.length) },
          { label: common('members'), value: formatNumber(totalMembers) },
          { label: common('amount'), value: formatCurrency(totalAmount) }
        ]}
        columns={columns}
        rows={normalizedRows}
        recordsLabel={common('records')}
        noRecordsLabel={common('noRecordsYet')}
      />
      <SiteFooter address={settings.address} phone={settings.phone} />
    </>
  );
}
