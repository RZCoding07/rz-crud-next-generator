import { NextRequest, NextResponse } from 'next/server';
import { generateAllFiles, createZipBlob } from '@/lib/fileGenerator';
import { GeneratorConfig } from '@/lib/codeGenerator';

export async function POST(request: NextRequest) {
  try {
    const config: GeneratorConfig = await request.json();

    if (!config.table || !config.columns) {
      return NextResponse.json(
        { error: 'Invalid configuration' },
        { status: 400 }
      );
    }

    // Generate all files
    const files = generateAllFiles(config);

    // Create ZIP blob
    const zipBlob = await createZipBlob(files);

    // Return as downloadable file
    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="crud-${config.table.name}.zip"`,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const config: GeneratorConfig = await request.json();

    if (!config.table || !config.columns) {
      return NextResponse.json(
        { error: 'Invalid configuration' },
        { status: 400 }
      );
    }

    // Generate all files
    const files = generateAllFiles(config);

    // Return files for preview
    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: String(error) },
      { status: 500 }
    );
  }
}
