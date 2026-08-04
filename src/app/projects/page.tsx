import LocaleProjectsPage from '../[locale]/projects/page';
import { renderLocalePage } from '../locale-page-wrapper';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('projects');
}

export default async function ProjectsPage() {
  return renderLocalePage(LocaleProjectsPage);
}