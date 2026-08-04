import 'server-only';
import { unstable_cache } from 'next/cache';

import { connectToDatabase } from './db';
import { HeroSlide } from '@/models/HeroSlide';
import { MasjidSettings } from '@/models/MasjidSettings';
import { PrayerTimes } from '@/models/PrayerTimes';
import { getMaghribTime } from './aladhan-maghrib';
import { Project } from '@/models/Project';
import { GalleryItem } from '@/models/GalleryItem';
import { IncomeRecord } from '@/models/IncomeRecord';
import { ExpenseRecord } from '@/models/ExpenseRecord';
import { Donation } from '@/models/Donation';
import { RamadanDonation } from '@/models/RamadanDonation';
import { RamadanExpense } from '@/models/RamadanExpense';
import { ShopRecord } from '@/models/ShopRecord';
import { FitrahRecord } from '@/models/FitrahRecord';

// Serialization helper to convert MongoDB objects to plain JSON
function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

export type SiteSettings = {
  masjidName: string;
  madrasaName: string;
  address: string;
  phone: string;
  prayerMarquee: string;
  notice?: string;
  logoUrl?: string;
  heroHeading?: string;
  heroSubheading?: string;
};

const fallbackSettings: SiteSettings = {
  masjidName: 'Jami Masjid Noori & Madrasa',
  madrasaName: 'Noori Madrasa',
  address: 'Korangi No. 1, Karachi, Pakistan',
  phone: '+92 300 1234567',
  prayerMarquee: 'Prayer times are managed live from the admin panel.',
  notice: 'Please give donation according to your ability and support the masjid and madrasa activities.'
};

function getDateKeyForTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function getCurrentDateKey() {
  const appTimeZone = process.env.APP_TIME_ZONE || 'Asia/Karachi';
  return getDateKeyForTimeZone(appTimeZone);
}

function isDatabaseConfigured() {
  return Boolean(process.env.MONGO_URI);
}

const getSiteSettingsCached = unstable_cache(async (): Promise<SiteSettings> => {
  await connectToDatabase();
  const settings = await MasjidSettings.findOne().sort({ updatedAt: -1 }).lean<SiteSettings | null>();
  return settings ? serialize(settings) : fallbackSettings;
}, ['public-site-settings'], { revalidate: 60, tags: ['public-site-settings'] });

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isDatabaseConfigured()) {
    return fallbackSettings;
  }

  try {
    return await getSiteSettingsCached();
  } catch {
    // Only used for this one request; a failed revalidation never overwrites
    // the cache entry with fallback data.
    return fallbackSettings;
  }
}

export async function getHeroSlides() {
  const fallbackSlides = [
    {
      title: 'جامع مسجد نورانی و مدرسہ',
      subtitle: 'کورنگی نمبر-1، کراچی',
      imageUrl: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?auto=format&fit=crop&w=1600&q=80',
      order: 1,
      active: true
    }
  ];

  if (!isDatabaseConfigured()) {
    return fallbackSlides;
  }

  const getHeroSlidesCached = unstable_cache(async () => {
    await connectToDatabase();
    const slides = await HeroSlide.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
    return slides.length > 0 ? serialize(slides) : fallbackSlides;
  }, ['public-hero-slides'], { revalidate: 60, tags: ['public-hero-slides'] });

  try {
    return await getHeroSlidesCached();
  } catch {
    return fallbackSlides;
  }
}

export async function getTodayPrayerTimes(): Promise<Record<string, string>> {
  const todayKey = getCurrentDateKey();
  const fallbackPrayerTimes: Record<string, string> = {
    dateKey: todayKey,
    fajr: '00:00',
    zohar: '00:00',
    asr: '00:00',
    maghrib: '00:00',
    isha: '00:00',
    juma: '00:00'
  };

  let baseTimes: Record<string, string> = fallbackPrayerTimes;

  if (isDatabaseConfigured()) {
    const getTodayPrayerTimesCached = unstable_cache(
      async (): Promise<Record<string, string>> => {
        await connectToDatabase();
        const latestPrayerTimes = await PrayerTimes.findOne().sort({ dateKey: -1, createdAt: -1 }).lean();
        return latestPrayerTimes ? (serialize(latestPrayerTimes) as Record<string, string>) : fallbackPrayerTimes;
      },
      ['public-prayer-times', todayKey],
      { revalidate: 60, tags: ['public-prayer-times'] }
    );
    try {
      baseTimes = await getTodayPrayerTimesCached();
    } catch {
      baseTimes = fallbackPrayerTimes;
    }
  }

  // Maghrib is ALWAYS sourced from the Aladhan API (Karachi). The previously
  // stored value is only used as a fallback if the API is unreachable.
  const apiMaghrib = await getMaghribTime(baseTimes.maghrib);
  return {
    ...baseTimes,
    maghrib: apiMaghrib ?? baseTimes.maghrib ?? '00:00'
  };
}

export async function getSummaryMetrics() {
  if (!isDatabaseConfigured()) {
    return {
      totalIncome: 65000,
      yearlyExpense: 21000,
      totalDonation: 12000,
      activeProjects: 1,
      totalShop: 0,
      totalFitrah: 0
    };
  }

  const getSummaryMetricsCached = unstable_cache(async () => {
    await connectToDatabase();
    const [incomeAgg, expenseAgg, donationAgg, projectCount, shopCount, fitrahAgg] = await Promise.all([
      IncomeRecord.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      ExpenseRecord.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Project.countDocuments(),
      ShopRecord.countDocuments(),
      FitrahRecord.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    return serialize({
      totalIncome: incomeAgg[0]?.total ?? 0,
      yearlyExpense: expenseAgg[0]?.total ?? 0,
      totalDonation: donationAgg[0]?.total ?? 0,
      activeProjects: projectCount,
      totalShop: shopCount,
      totalFitrah: fitrahAgg[0]?.total ?? 0
    });
  }, ['public-summary-metrics'], { revalidate: 60, tags: ['public-summary-metrics'] });

  try {
    return await getSummaryMetricsCached();
  } catch {
    // Only used for this one request; a failed revalidation never overwrites
    // the cache entry with placeholder numbers.
    return {
      totalIncome: 65000,
      yearlyExpense: 21000,
      totalDonation: 12000,
      activeProjects: 1,
      totalShop: 0,
      totalFitrah: 0
    };
  }
}

export async function getProjects() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const getProjectsCached = unstable_cache(async () => {
    await connectToDatabase();
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    return serialize(projects);
  }, ['public-projects'], { revalidate: 90, tags: ['public-projects'] });

  try {
    return await getProjectsCached();
  } catch {
    return [];
  }
}

export async function getGallery() {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const getGalleryCached = unstable_cache(async () => {
    await connectToDatabase();
    const items = await GalleryItem.find().sort({ order: 1, createdAt: -1 }).lean();
    return serialize(items);
  }, ['public-gallery'], { revalidate: 90, tags: ['public-gallery'] });

  try {
    return await getGalleryCached();
  } catch {
    return [];
  }
}

export async function getIncomeRecords() {
  if (!isDatabaseConfigured()) return [];

  const getIncomeRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await IncomeRecord.find().sort({ createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-income-records'], { revalidate: 60, tags: ['public-income-records'] });

  try {
    return await getIncomeRecordsCached();
  } catch {
    return [];
  }
}

export async function getExpenseRecords() {
  if (!isDatabaseConfigured()) return [];

  const getExpenseRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await ExpenseRecord.find().sort({ createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-expense-records'], { revalidate: 60, tags: ['public-expense-records'] });

  try {
    return await getExpenseRecordsCached();
  } catch {
    return [];
  }
}

export async function getShopRecords() {
  if (!isDatabaseConfigured()) return [];

  const getShopRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await ShopRecord.find().sort({ year: -1, month: -1, date: -1, createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-shop-records'], { revalidate: 60, tags: ['public-shop-records'] });

  try {
    return await getShopRecordsCached();
  } catch {
    return [];
  }
}

export async function getDonationRecords() {
  if (!isDatabaseConfigured()) return [];

  const getDonationRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await Donation.find().sort({ createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-donation-records'], { revalidate: 60, tags: ['public-donation-records'] });

  try {
    return await getDonationRecordsCached();
  } catch {
    return [];
  }
}

export async function getRamadanDonationRecords() {
  if (!isDatabaseConfigured()) return [];

  const getRamadanDonationRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await RamadanDonation.find().sort({ createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-ramadan-donation-records'], { revalidate: 60, tags: ['public-ramadan-donation-records'] });

  try {
    return await getRamadanDonationRecordsCached();
  } catch {
    return [];
  }
}

export async function getRamadanExpenseRecords() {
  if (!isDatabaseConfigured()) return [];

  const getRamadanExpenseRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await RamadanExpense.find().sort({ createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-ramadan-expense-records'], { revalidate: 60, tags: ['public-ramadan-expense-records'] });

  try {
    return await getRamadanExpenseRecordsCached();
  } catch {
    return [];
  }
}

export async function getFitrahRecords() {
  if (!isDatabaseConfigured()) return [];

  const getFitrahRecordsCached = unstable_cache(async () => {
    await connectToDatabase();
    const records = await FitrahRecord.find().sort({ createdAt: -1 }).limit(200).lean();
    return serialize(records);
  }, ['public-fitrah-records'], { revalidate: 60, tags: ['public-fitrah-records'] });

  try {
    return await getFitrahRecordsCached();
  } catch {
    return [];
  }
}
