import { connectToDatabase } from '@/lib/db';
import { apiError, json } from '@/lib/api';
import { getServerSession } from '@/lib/auth';
import { resourceMap } from '@/lib/admin-resources';
import { minutesToCanonical24, parsePrayerTimeToMinutes } from '@/lib/prayer-activity';
import { revalidatePublicData } from '@/lib/revalidate-public';

type Params = { params: Promise<{ collection: string; id: string }> };

function normalizePrayerTimesPatchBody(body: Record<string, unknown>) {
  // Maghrib is fetched automatically from the Aladhan API and can never be
  // patched from the admin panel.
  delete body.maghrib;
  const keys = ['fajr', 'zohar', 'asr', 'isha', 'juma'] as const;

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const raw = String(body[key] ?? '').trim();

    if (!raw) {
      if (key === 'juma') {
        body[key] = '';
        continue;
      }
      return { ok: false as const, message: `${key} time cannot be empty.` };
    }

    const minutes = parsePrayerTimeToMinutes(raw);
    if (minutes === null) {
      return { ok: false as const, message: `Invalid ${key} time. Use 4:15 PM or 16:15.` };
    }
    body[key] = minutesToCanonical24(minutes);
  }

  return { ok: true as const };
}

export async function PATCH(request: Request, { params }: Params) {
  const { collection, id } = await params;
  const resource = resourceMap[collection as keyof typeof resourceMap];
  if (!resource) return apiError('Unknown collection', 404);

  const session = await getServerSession();
  if (!session) return apiError('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return apiError('Invalid request body', 400);

  if (collection === 'prayer-times') {
    const normalized = normalizePrayerTimesPatchBody(body as Record<string, unknown>);
    if (!normalized.ok) return apiError(normalized.message, 400);
  }

  const parsed = resource.schema.partial().safeParse(body);
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

  await connectToDatabase();
  const updated = await resource.model.findByIdAndUpdate(id, { ...parsed.data, addedBy: session.id }, { new: true });

  if (collection === 'prayer-times' && updated?._id) {
    await resource.model.deleteMany({ _id: { $ne: updated._id } });
  }

  revalidatePublicData(collection);
  return json({ ok: true, item: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { collection, id } = await params;
  const resource = resourceMap[collection as keyof typeof resourceMap];
  if (!resource) return apiError('Unknown collection', 404);

  const session = await getServerSession();
  if (!session) return apiError('Unauthorized', 401);

  await connectToDatabase();
  await resource.model.findByIdAndDelete(id);
  revalidatePublicData(collection);
  return json({ ok: true });
}
