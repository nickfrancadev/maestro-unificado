// Upload creative images to Supabase Storage. Returns a signed URL the
// LinkedIn API can fetch when the campaign creative is created.

import { SERVER_BASE, headers } from './client';

export interface CreativeUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  filename?: string;
  error?: string;
}

export async function uploadCreativeImageToStorage(file: File): Promise<CreativeUploadResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const response = await fetch(`${SERVER_BASE}/creative-upload`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        image_base64: base64,
        filename: file.name,
        content_type: file.type || 'image/png',
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[Creative Upload] Server error:', data);
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return await response.json();
  } catch (err: any) {
    console.error('[Creative Upload] Erro:', err);
    return { success: false, error: err.message };
  }
}
