import LocaleIncomePage from '../[locale]/income/page';
import { renderLocalePage } from '../locale-page-wrapper';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('income');
}

export default async function IncomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return renderLocalePage(LocaleIncomePage, searchParams);
}