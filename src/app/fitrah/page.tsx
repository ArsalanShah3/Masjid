import LocaleFitrahPage from '../[locale]/fitrah/page';
import { renderLocalePage } from '../locale-page-wrapper';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('fitrah');
}

export default async function FitrahPage() {
  return renderLocalePage(LocaleFitrahPage);
}