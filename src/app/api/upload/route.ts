import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const BUCKET_NAME = 'akoya-images';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const safeName = `sku-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(safeName, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(safeName);

      return NextResponse.json({ url: publicUrlData.publicUrl });
    }

    // Local filesystem fallback
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), bytes);

    return NextResponse.json({ url: `/uploads/${safeName}` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
