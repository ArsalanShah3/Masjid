import { cookies } from 'next/headers';
import { getMessages } from 'next-intl/server';
import LocaleHomePage from './[locale]/page';
import { Providers } from '@/components/providers';
import { buildHomeMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata();
}

export default async function RootPage() {
  const localeCookie = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = localeCookie === 'ur' ? 'ur' : 'en';
  const messages = await getMessages({ locale });

  return (
    <Providers locale={locale} messages={messages}>
      <div dir={locale === 'ur' ? 'rtl' : 'ltr'}>
        <LocaleHomePage params={Promise.resolve({ locale })} />
      </div>
    </Providers>
  );
}