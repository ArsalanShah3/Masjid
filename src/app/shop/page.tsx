import LocaleShopPage from '../[locale]/shop/page';
import { renderLocalePage } from '../locale-page-wrapper';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('shop');
}

export default async function ShopPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return renderLocalePage(LocaleShopPage, searchParams);
}