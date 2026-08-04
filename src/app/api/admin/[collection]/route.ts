import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import { apiError, json } from '@/lib/api';
import { getServerSession } from '@/lib/auth';
import { resourceMap } from '@/lib/admin-resources';
import { rateLimit } from '@/lib/rate-limit';
import { minutesToCanonical24, parsePrayerTimeToMinutes } from '@/lib/prayer-activity';
import { revalidatePublicData } from '@/lib/revalidate-public';

type Params = { params: Promise<{ collection: string }> };

async function generateShopSerialNumber(model: {
  findOne: (query: Record<string, unknown>) => { sort: (opts: Record<string, unknown>) => { lean: <T>() => Promise<T> } };
  exists: (query: Record<string, unknown>) => Promise<unknown>;
}) {
  const last = await model
    .findOne({ serialNumber: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .lean<{ serialNumber?: string } | null>();

  let nextNumber = 1;
  const match = last?.serialNumber ? String(last.serialNumber).match(/(\d+)$/) : null;
  if (match) {
    nextNumber = parseInt(match[1], 10) + 1;
  }

  let candidate = `SR-${String(nextNumber).padStart(6, '0')}`;
  // Guarantee uniqueness even if there are gaps/collisions from deleted records.
  // eslint-disable-next-line no-await-in-loop
  while (await model.exists({ serialNumber: candidate })) {
    nextNumber += 1;
    candidate = `SR-${String(nextNumber).padStart(6, '0')}`;
  }

  return candidate;
}

function normalizePrayerTimesBody(body: Record<string, unknown>) {
  // Maghrib is fetched automatically from the Aladhan API and can never be
  // set from the admin panel. Any value the client submits is discarded here.
  delete body.maghrib;
  const requiredKeys = ['fajr', 'zohar', 'asr', 'isha'] as const;
  const optionalKeys = ['juma'] as const;

  for (const key of requiredKeys) {
    const value = body[key];
    const minutes = parsePrayerTimeToMinutes(typeof value === 'string' ? value : '');
    if (minutes === null) {
      return { ok: false as const, message: `Invalid ${key} time. Use 4:15 PM or 16:15.` };
    }
    body[key] = minutesToCanonical24(minutes);
  }

  for (const key of optionalKeys) {
    const raw = String(body[key] ?? '').trim();
    if (!raw) {
      body[key] = '';
      continue;
    }
    const minutes = parsePrayerTimeToMinutes(raw);
    if (minutes === null) {
      return { ok: false as const, message: `Invalid ${key} time. Use 1:30 PM or 13:30.` };
    }
    body[key] = minutesToCanonical24(minutes);
  }

  return { ok: true as const };
}

function normalizeShopRecordBody(body: Record<string, unknown>) {
  const dateValue = String(body.date ?? body.buyDate ?? '').trim() || new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T00:00:00Z`)
    : new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return { ok: false as const, message: 'Invalid shop date. Use a valid date.' };
  }

  body.date = dateValue;
  if (body.buyDate == null || String(body.buyDate).trim() === '') {
    body.buyDate = dateValue;
  }

  if (body.month == null || body.year == null) {
    body.month = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    body.year = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? date.getUTCFullYear() : date.getFullYear();
  }

  return { ok: true as const };
}

function deriveFallbackDate(record: Record<string, unknown>) {
  const rawDate = String(record.date ?? '').trim();
  if (rawDate) {
    return record;
  }

  const month = Number(record.month ?? 0);
  const year = Number(record.year ?? 0);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return record;
  }

  return {
    ...record,
    date: new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
  };
}

async function ensureDatabaseReady() {
  try {
    await connectToDatabase();
    return true;
  } catch {
    return false;
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { collection } = await params;
  const resource = resourceMap[collection as keyof typeof resourceMap];

  if (!resource) return apiError('Unknown collection', 404);

  const session = await getServerSession();
  if (!session) return apiError('Unauthorized', 401);

  if (!(await ensureDatabaseReady())) {
    return apiError('Database connection unavailable', 503);
  }

  try {
    if (collection === 'shop-records') {
      const url = new URL(_request.url);
      const serialQuery = url.searchParams.get('serial');
      if (serialQuery !== null) {
        const trimmedSerial = serialQuery.trim();
        if (!trimmedSerial) {
          return apiError('Serial number is required', 400);
        }

        const found = await resource.model.findOne({ serialNumber: trimmedSerial }).lean();
        if (!found) {
          return json({ ok: true, item: null, found: false, message: 'No shop record found for this serial number.' });
        }

        return json({ ok: true, item: found, found: true });
      }
    }

    const items = await (collection === 'shop-records'
      ? resource.model.find().sort({ year: -1, month: -1, date: -1, createdAt: -1 }).lean()
      : collection === 'prayer-times'
        ? resource.model.find().sort({ dateKey: -1, createdAt: -1 }).lean()
        : resource.model.find().sort({ createdAt: -1 }).lean());

    const hydratedItems = collection === 'expense-records'
      ? (items as Array<Record<string, unknown>>).map((item) => deriveFallbackDate(item))
      : items;

    return json({ ok: true, items: hydratedItems });
  } catch {
    return apiError('Database query failed', 503);
  }
}

export async function POST(request: Request, { params }: Params) {
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') || 'unknown';
  const limit = rateLimit(`admin-post:${ip}`, 60, 60_000);
  if (!limit.allowed) return apiError('Rate limit exceeded', 429);

  const { collection } = await params;
  const resource = resourceMap[collection as keyof typeof resourceMap];
  if (!resource) return apiError('Unknown collection', 404);

  const session = await getServerSession();
  if (!session) return apiError('Unauthorized', 401);

  if (!(await ensureDatabaseReady())) {
    return apiError('Database connection unavailable', 503);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return apiError('Invalid request body', 400);
  }

  if (collection === 'staff-records') {
    const candidate = body as Record<string, unknown>;
    const rawDateKey = candidate.dateKey;
    if (rawDateKey == null || String(rawDateKey).trim() === '') {
      delete candidate.dateKey;
    }
  }

  if (collection === 'prayer-times') {
    const normalized = normalizePrayerTimesBody(body as Record<string, unknown>);
    if (!normalized.ok) {
      return apiError(normalized.message, 400);
    }
  }

  if (collection === 'income-records' || collection === 'expense-records') {
    const candidate = body as Record<string, unknown>;
    if (candidate.date == null || String(candidate.date).trim() === '') {
      candidate.date = new Date().toISOString().slice(0, 10);
    }
  }

  if (collection === 'shop-records') {
    const normalized = normalizeShopRecordBody(body as Record<string, unknown>);
    if (!normalized.ok) {
      return apiError(normalized.message, 400);
    }
  }

  // 👇 YEH VALA CODE AAPNE BILKUL ISKE NICHE ADD KARNA HAI 👇
  if (collection === 'rent-records') {
    const candidate = body as Record<string, unknown>;
    if (candidate.receivedDate == null || String(candidate.receivedDate).trim() === '') {
      candidate.receivedDate = new Date().toISOString().slice(0, 10);
    }
  }

  const parsed = resource.schema.safeParse(body);

  if (!parsed.success) {
    return apiError('Validation failed', 400, parsed.error.flatten());
  }

  await connectToDatabase();

  let existingShopRecordId: unknown = null;
  let existingStaffRecordId: unknown = null;

  if (collection === 'staff-records') {
    const input = parsed.data as { staffName: string; role: string; dateKey: Date };
    const currentDate = new Date(input.dateKey);
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Same staff + role + day already has a record: instead of blocking the
    // save, remember its id so we update that existing record below rather
    // than creating a duplicate. This lets a previously-saved day's
    // attendance be edited simply by saving again for that date.
    const duplicate = await resource.model.findOne({
      staffName: input.staffName,
      role: input.role,
      dateKey: { $gte: startOfDay, $lte: endOfDay }
    }).lean() as Record<string, unknown> | null;

    if (duplicate?._id) {
      existingStaffRecordId = duplicate._id;
    }
  }

  if (collection === 'shop-records') {
    const input = parsed.data as {
      shopName: string;
      ownerName: string;
      month: number;
      year: number;
      paymentStatus?: 'Clear' | 'Due' | 'Partial';
      paymentAmount?: number;
      monthlyRent: number;
      debtAmount?: number;
      monthsDue?: number;
      buyDate?: string | Date;
      rentHistory?: Record<string, Record<string, unknown>>;
    };

    const shopName = String(input.shopName ?? '').trim();
    const ownerName = String(input.ownerName ?? '').trim();
    const month = Number(input.month ?? 0);
    const year = Number(input.year ?? 0);
    const currentMonthlyRent = Number(input.monthlyRent ?? 0);
    const paidAmount = Number(input.paymentAmount ?? 0);
    const manualPreviousBalance = Number((input as Record<string, unknown>).previousBalance ?? Number.NaN);

    if (!shopName || !ownerName) {
      return apiError('Shop name and tenant name are required.', 400);
    }

    const shopQuery = {
      shopName: { $regex: `^${shopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      ownerName: { $regex: `^${ownerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    };

    const buyDate = input.buyDate ? new Date(String(input.buyDate)) : new Date();
    if (!Number.isNaN(buyDate.getTime())) {
      const startMonth = buyDate.getMonth() + 1;
      const startYear = buyDate.getFullYear();
      if (year < startYear || (year === startYear && month < startMonth)) {
        return apiError('Selected month/year cannot be before the property start date.', 400);
      }
    }

    const existingRecord = await resource.model.findOne({
      ...shopQuery,
      month,
      year
    }).lean() as Record<string, unknown> | null;

    if (existingRecord) {
      existingShopRecordId = existingRecord._id;
    }

    const priorRecords = await resource.model.find({
      ...shopQuery,
      $or: [
        { year: { $lt: year } },
        { year, month: { $lt: month } }
      ]
    }).sort({ year: 1, month: 1, createdAt: 1 }).lean() as Array<Record<string, unknown>>;

    // Total unpaid arrears from all earlier months, as they stood before this
    // transaction's payment is applied. This is what "Previous Balance" means:
    // how much the shop still owed from before, separate from this month's rent.
    const previousBalanceBeforePayment = Number.isFinite(manualPreviousBalance) && manualPreviousBalance >= 0
      ? manualPreviousBalance
      : priorRecords.reduce(
          (sum, record) => sum + Number(record.debtAmount ?? 0),
          0
        );

    const rentHistoryEntries: Record<string, Record<string, unknown>> = {};

    priorRecords.forEach((record) => {
      const recordMonth = Number(record.month ?? 0);
      const recordYear = Number(record.year ?? 0);
      const key = `${recordYear}-${String(recordMonth).padStart(2, '0')}`;
      rentHistoryEntries[key] = {
        month: recordMonth,
        year: recordYear,
        rentAmount: Number(record.monthlyRent ?? 0),
        paidAmount: Number(record.paymentAmount ?? 0),
        remainingBalance: Number(record.debtAmount ?? 0),
        status: String(record.paymentStatus ?? 'Due'),
        paymentDate: String(record.date ?? record.buyDate ?? '')
      };
    });

    const shopData = parsed.data as Record<string, unknown>;
    const currentKey = `${year}-${String(month).padStart(2, '0')}`;
    rentHistoryEntries[currentKey] = {
      month,
      year,
      rentAmount: currentMonthlyRent,
      paidAmount: 0,
      remainingBalance: currentMonthlyRent,
      status: 'Due',
      paymentDate: String(shopData.date ?? existingRecord?.date ?? new Date().toISOString().slice(0, 10))
    };

    const sortedHistoryKeys = Object.keys(rentHistoryEntries).sort((a, b) => a.localeCompare(b));
    let remainingPayment = paidAmount;

    sortedHistoryKeys.forEach((key) => {
      const entry = rentHistoryEntries[key];
      const rentAmount = Number(entry.rentAmount ?? 0);
      const currentPaid = Number(entry.paidAmount ?? 0);
      const outstanding = Math.max(0, rentAmount - currentPaid);

      if (outstanding <= 0 || remainingPayment <= 0) {
        return;
      }

      const appliedAmount = Math.min(outstanding, remainingPayment);
      const nextPaid = currentPaid + appliedAmount;
      const nextBalance = Math.max(0, rentAmount - nextPaid);
      entry.paidAmount = nextPaid;
      entry.remainingBalance = nextBalance;
      entry.status = nextBalance === 0 ? 'Clear' : nextPaid > 0 ? 'Partial' : 'Due';
      entry.paymentDate = String(entry.paymentDate || new Date().toISOString().slice(0, 10));
      remainingPayment = Math.max(0, remainingPayment - appliedAmount);
    });

    const currentEntry = rentHistoryEntries[currentKey] as Record<string, unknown>;
    const paymentDate = String(shopData.date ?? existingRecord?.date ?? new Date().toISOString().slice(0, 10));
    const currentBalance = Math.max(0, previousBalanceBeforePayment + currentMonthlyRent - Math.min(paidAmount, previousBalanceBeforePayment + currentMonthlyRent));
    const savedPaymentAmount = Math.min(Math.max(0, paidAmount), previousBalanceBeforePayment + currentMonthlyRent);
    const currentStatus = currentBalance === 0 ? 'Clear' : (savedPaymentAmount > 0 ? 'Partial' : 'Due');

    currentEntry.previousBalance = previousBalanceBeforePayment;
    currentEntry.remainingBalance = currentBalance;
    currentEntry.paidAmount = savedPaymentAmount;
    currentEntry.status = currentStatus;
    currentEntry.paymentDate = paymentDate;

    (parsed.data as Record<string, unknown>).monthlyRent = currentMonthlyRent;
    (parsed.data as Record<string, unknown>).debtAmount = currentBalance;
    (parsed.data as Record<string, unknown>).paymentAmount = savedPaymentAmount;
    (parsed.data as Record<string, unknown>).paymentStatus = currentStatus;
    (parsed.data as Record<string, unknown>).previousBalance = previousBalanceBeforePayment;
    (parsed.data as Record<string, unknown>).rentHistory = rentHistoryEntries;

    if (existingRecord?.serialNumber) {
      // Editing/updating an existing month's record: keep its original serial number.
      (parsed.data as Record<string, unknown>).serialNumber = existingRecord.serialNumber;
    } else {
      // New month entry: always issue a fresh, never-reused serial number.
      (parsed.data as Record<string, unknown>).serialNumber = await generateShopSerialNumber(resource.model as unknown as Parameters<typeof generateShopSerialNumber>[0]);
    }

    const priorRecordUpdates: Array<Promise<unknown>> = [];

    priorRecords.forEach((record) => {
      const recordMonth = Number(record.month ?? 0);
      const recordYear = Number(record.year ?? 0);
      const recordKey = `${recordYear}-${String(recordMonth).padStart(2, '0')}`;
      const entry = rentHistoryEntries[recordKey];
      if (!entry) return;

      const updatedPaymentAmount = Number(entry.paidAmount ?? 0);
      const updatedDebtAmount = Number(entry.remainingBalance ?? 0);
      const updatedStatus = String(entry.status ?? 'Due');
      const changes: Record<string, unknown> = {};

      if (updatedPaymentAmount !== Number(record.paymentAmount ?? 0)) {
        changes.paymentAmount = updatedPaymentAmount;
      }
      if (updatedDebtAmount !== Number(record.debtAmount ?? 0)) {
        changes.debtAmount = updatedDebtAmount;
      }
      if (updatedStatus !== String(record.paymentStatus ?? 'Due')) {
        changes.paymentStatus = updatedStatus;
      }

      if (Object.keys(changes).length > 0 && record._id) {
        priorRecordUpdates.push(resource.model.findByIdAndUpdate(record._id, changes).exec());
      }
    });

    if (existingRecord) {
      shopData.buyDate = existingRecord.buyDate ?? shopData.buyDate;
      shopData.note = String(shopData.note ?? existingRecord.note ?? '');
    }

    if (priorRecordUpdates.length > 0) {
      await Promise.all(priorRecordUpdates);
    }
  }

  try {
    if (collection === 'prayer-times') {
      const latestPrayerTimes = await resource.model.findOne().sort({ dateKey: -1, createdAt: -1 }).lean<{ _id?: unknown } | null>();

      if (latestPrayerTimes?._id) {
        const updated = await resource.model.findByIdAndUpdate(latestPrayerTimes._id, { ...parsed.data, addedBy: session.id }, { new: true });

        if (!updated) {
          return apiError('Unable to update record', 400);
        }

        await resource.model.deleteMany({ _id: { $ne: updated._id } });
        revalidatePublicData(collection);
        return json({ ok: true, item: updated });
      }
    }

    if (collection === 'shop-records' && existingShopRecordId) {
      const updated = await resource.model.findByIdAndUpdate(existingShopRecordId, { ...parsed.data, addedBy: session.id }, { new: true });

      if (!updated) {
        return apiError('Unable to update shop record', 400);
      }

      revalidatePublicData(collection);
      return json({ ok: true, item: updated });
    }

    if (collection === 'staff-records' && existingStaffRecordId) {
      const updated = await resource.model.findByIdAndUpdate(existingStaffRecordId, { ...parsed.data, addedBy: session.id }, { new: true });

      if (!updated) {
        return apiError('Unable to update attendance record', 400);
      }

      return json({ ok: true, item: updated });
    }

    const created = await resource.model.create({ ...parsed.data, addedBy: session.id });

    if (collection === 'prayer-times') {
      await resource.model.deleteMany({ _id: { $ne: created._id } });
    }

    revalidatePublicData(collection);
    return json({ ok: true, item: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create record';
    return apiError(message, 400);
  }
}
