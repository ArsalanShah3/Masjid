import LocaleDonationsPage from '../[locale]/donations/page';
import { renderLocalePage } from '../locale-page-wrapper';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('donations');
}

export default async function DonationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return renderLocalePage(LocaleDonationsPage, searchParams);
}