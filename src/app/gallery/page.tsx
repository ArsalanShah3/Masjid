import LocaleGalleryPage from '../[locale]/gallery/page';
import { renderLocalePage } from '../locale-page-wrapper';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('gallery');
}

export default async function GalleryPage() {
  return renderLocalePage(LocaleGalleryPage);
}