import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // allow up to 50MB for video uploads

// Target range for compressed images before they reach Cloudinary.
const TARGET_MAX_BYTES = 300 * 1024;
const TARGET_MIN_BYTES = 100 * 1024;
const MAX_DIMENSION = 1920;

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER || 'masjid';

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret, folder };
}

// Resizes to a sane max dimension, then steps quality down until the result
// is under TARGET_MAX_BYTES (or quality bottoms out). Animated images
// (GIF/WebP with multiple frames) are passed through untouched since
// re-encoding would drop the animation.
async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; contentType: string }> {
  const sharp = (await import('sharp')).default;

  const image = sharp(buffer, { animated: true });
  const metadata = await image.metadata();

  if ((metadata.pages ?? 1) > 1) {
    return { buffer, contentType: mimeType };
  }

  const resized = image.rotate().resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true
  });

  let quality = 80;
  let output = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();

  while (output.length > TARGET_MAX_BYTES && quality > 35) {
    quality -= 10;
    output = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  // If the source was already tiny and our re-encode made it bigger, keep
  // whichever is smaller rather than penalizing already-small images.
  if (buffer.length < TARGET_MIN_BYTES && buffer.length < output.length) {
    return { buffer, contentType: mimeType };
  }

  return { buffer: output, contentType: 'image/jpeg' };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }

    const formData = await request.formData();
    const mediaType = String(formData.get('mediaType') ?? 'image');
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'File is required' }, { status: 400 });
    }

    if (mediaType === 'image') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ ok: false, message: 'Only image uploads are supported as image type' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, message: 'Image size must be 50MB or less' }, { status: 400 });
      }
    } else if (mediaType === 'video') {
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ ok: false, message: 'Only video uploads are supported as video type' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, message: 'Video size must be 50MB or less' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ ok: false, message: 'Unsupported mediaType' }, { status: 400 });
    }

    const env = getCloudinaryEnv();
    if (!env) {
      return NextResponse.json({ ok: false, message: 'Cloudinary is not configured' }, { status: 500 });
    }

    const { v2: cloudinary } = await import('cloudinary');

    cloudinary.config({
      cloud_name: env.cloudName,
      api_key: env.apiKey,
      api_secret: env.apiSecret,
      secure: true
    });

    let fileBuffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());

    if (mediaType === 'image') {
      try {
        const compressed = await compressImage(fileBuffer, file.type);
        fileBuffer = compressed.buffer;
      } catch {
        // If compression fails for any reason (corrupt file, unsupported
        // format, etc.) fall back to uploading the original untouched.
      }
    }

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: env.folder,
          resource_type: mediaType === 'video' ? 'video' : 'image',
          overwrite: false,
          unique_filename: true,
          // Videos aren't practical to re-encode in a serverless function
          // without an ffmpeg binary, so compression happens on Cloudinary's
          // side via eager quality/bitrate transforms at upload time.
          ...(mediaType === 'video'
            ? {
                eager: [{ quality: 'auto:good', fetch_format: 'auto' }],
                eager_async: false
              }
            : {})
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }

          if (!uploadResult?.secure_url || !uploadResult.public_id) {
            reject(new Error('Cloudinary did not return a valid upload response'));
            return;
          }

          const eagerUrl = uploadResult.eager?.[0]?.secure_url;
          resolve({ secure_url: eagerUrl || uploadResult.secure_url, public_id: uploadResult.public_id });
        }
      );

      upload.end(fileBuffer);
    });

    return NextResponse.json({
      ok: true,
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: mediaType
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
