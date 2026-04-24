import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock cloudinary env vars absent by default
describe('cloudinary mock fallback', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('restituisce URL mock quando env Cloudinary non configurate', async () => {
    // Ensure env vars are absent
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    vi.stubEnv('CLOUDINARY_API_KEY', '');
    vi.stubEnv('CLOUDINARY_API_SECRET', '');

    const { uploadImage } = await import('@/lib/cloudinary');
    const result = await uploadImage(Buffer.from('fake'), 'test/folder');
    expect(result.url).toContain('placehold.co');
    expect(result.publicId).toMatch(/^mock\//);
  });

  it('restituisce URL mock per uploadSignature senza env', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    vi.stubEnv('CLOUDINARY_API_KEY', '');
    vi.stubEnv('CLOUDINARY_API_SECRET', '');

    const { uploadSignature } = await import('@/lib/cloudinary');
    const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await uploadSignature(fakeDataUrl, 'test/sigs');
    expect(result.url).toContain('placehold.co');
    expect(result.publicId).toMatch(/^mock\/sig\//);
  });
});
