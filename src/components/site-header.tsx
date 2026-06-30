'use client';

import { useTranslations } from 'next-intl';
import { Menu, Phone, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@/navigation';
import { Logo } from './logo';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';

const navItems = [
  { href: '/', key: 'home' },
  { href: '/income', key: 'income' },
  { href: '/expense', key: 'expense' },
  { href: '/shop', key: 'shop' },
  { href: '/fitrah', key: 'fitrah' },
  { href: '/projects', key: 'projects' },
  { href: '/gallery', key: 'gallery' }
];

const donationOptions = [
  { href: '/donations?type=friday', key: 'fridayDonation' },
  { href: '/donations?type=box', key: 'donationBox' }
];

export function SiteHeader({
  phone = '+92 300 1234567',
  masjidName
}: {
  phone?: string;
  masjidName?: string;
}) {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [donationDropdownOpen, setDonationDropdownOpen] = useState(false);
  const normalizedName = (masjidName || '').trim();
  const words = normalizedName.split(/\s+/).filter(Boolean);
  const hasSplitName = words.length > 2;
  const logoTopText = hasSplitName ? words.slice(0, 2).join(' ') : (masjidName || t('brandTop'));
  const logoBottomText = hasSplitName ? words.slice(2).join(' ') : t('brandBottom');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 text-slate-900 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75 dark:text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <Link href="/" className="shrink-0">
          <Logo topText={logoTopText} bottomText={logoBottomText} tone="dark" />
        </Link>
        <nav className="hidden items-center gap-1 xl:flex">
          {navItems.map((item) => (
            <Link key={item.key} href={item.href} className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white">
              {t(item.key as 'home' | 'gallery' | 'projects' | 'income' | 'expense' | 'shop')}
            </Link>
          ))}
          {/* Donation Dropdown */}
          <div className="relative group">
            <button className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white inline-flex items-center gap-1">
              {tNav('donation')}
              <ChevronDown className="h-4 w-4 transition group-hover:rotate-180" />
            </button>
            <div className="absolute left-0 top-full hidden group-hover:block bg-white dark:bg-slate-950 rounded-lg shadow-lg border border-slate-200 dark:border-white/10 overflow-hidden min-w-max z-50">
              {donationOptions.map((option) => (
                <Link
                  key={option.key}
                  href={option.href}
                  className="block px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-emerald-800 dark:hover:text-white transition"
                >
                  {tNav(option.key as 'fridayDonation' | 'donationBox')}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/90">
            <Phone className="h-4 w-4" />
            <span dir="ltr" className="[unicode-bidi:isolate]">{phone}</span>
          </div>
        </div>
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-white" onClick={() => setOpen(!open)}>
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open ? (
        <div className="reveal border-t border-slate-200/80 bg-white/95 px-4 py-4 shadow-lg dark:border-white/10 dark:bg-slate-950 lg:hidden">
          <div className="grid gap-3">
            {navItems.map((item) => (
              <Link key={item.key} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                {t(item.key as 'home' | 'gallery' | 'projects' | 'income' | 'expense' | 'shop')}
              </Link>
            ))}
            {/* Mobile Donation Dropdown */}
            <div>
              <button
                onClick={() => setDonationDropdownOpen(!donationDropdownOpen)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 flex items-center justify-between"
              >
                {tNav('donation')}
                <ChevronDown className={`h-4 w-4 transition ${donationDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {donationDropdownOpen && (
                <div className="mt-2 grid gap-2 pl-2">
                  {donationOptions.map((option) => (
                    <Link
                      key={option.key}
                      href={option.href}
                      className="block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {tNav(option.key as 'fridayDonation' | 'donationBox')}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
