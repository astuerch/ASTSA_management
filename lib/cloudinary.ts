import type { v2 as CloudinaryType } from 'cloudinary';

const MOCK_URL = 'https://placehold.co/800x600?text=mock-photo';

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    return { url: MOCK_URL, publicId: `mock/${Date.now()}` };
  }

  const { v2: cloudinary } = (await import('cloudinary')) as { v2: typeof CloudinaryType };
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; publicId?: string; resourceType?: 'image' | 'raw' | 'auto' },
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    return { url: MOCK_URL, publicId: options.publicId ?? `mock/${Date.now()}` };
  }

  const { v2: cloudinary } = (await import('cloudinary')) as { v2: typeof CloudinaryType };
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType ?? 'auto',
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function uploadSignature(dataUrl: string, folder: string): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    return { url: MOCK_URL, publicId: `mock/sig/${Date.now()}` };
  }

  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  return uploadImage(buffer, folder);
}
