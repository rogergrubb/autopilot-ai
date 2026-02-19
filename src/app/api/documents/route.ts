import { NextResponse } from 'next/server';
import { createDocument } from '@/lib/documents/create';

/**
 * POST /api/documents — Create a document and return downloadable content.
 */
export async function POST(req: Request) {
  try {
    const { format, title, content, fileName } = await req.json();

    if (!format || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: format, title, content' },
        { status: 400 }
      );
    }

    const validFormats = ['pdf', 'csv', 'html', 'markdown', 'json', 'txt', 'tsv'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createDocument(format, title, content, fileName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      mimeType: result.mimeType,
      base64: result.base64,
      downloadUrl: `data:${result.mimeType};base64,${result.base64}`,
    });
  } catch (error: unknown) {
    console.error('[Documents API]', error);
    return NextResponse.json(
      { error: `Document creation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
