import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDocs, saveDocMeta, saveChunks, chunkText, embedText } from '@/lib/rag';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getDocs());
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const allowedExts = ['txt', 'md', 'csv', 'pdf', 'xlsx'];
  if (!allowedExts.includes(ext)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use TXT, MD, CSV, PDF, or XLSX.' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';

  if (ext === 'pdf') {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    text = data.text;
  } else if (ext === 'xlsx') {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buffer);
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      parts.push(`Sheet: ${sheetName}\n${csv}`);
    }
    text = parts.join('\n\n');
  } else {
    text = buffer.toString('utf-8');
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const rawChunks = chunkText(text);

  // Embed sequentially to avoid rate limit bursts
  const chunks = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const embedding = await embedText(rawChunks[i]);
    chunks.push({ id: `${id}-${i}`, docId: id, text: rawChunks[i], embedding });
  }

  saveChunks(id, chunks);
  saveDocMeta({ id, name: file.name, size: file.size, uploadedAt: new Date().toISOString(), chunkCount: chunks.length });

  return NextResponse.json({ id, name: file.name, chunkCount: chunks.length });
}
