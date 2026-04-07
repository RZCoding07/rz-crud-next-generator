import { NextRequest, NextResponse } from 'next/server';
import { getTables, getTableSchema, testConnection } from '@/lib/db';

export async function GET() {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          error: 'Failed to connect to database. Set DATABASE_URL in environment variables to use a real database.',
          demoMode: true 
        },
        { status: 200 }
      );
    }

    const tables = await getTables();
    return NextResponse.json({ success: true, tables, demoMode: !process.env.DATABASE_URL });
  } catch (error) {
    console.error('Introspection error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to introspect database', 
        details: String(error),
        demoMode: true 
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tableName } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: 'tableName is required' },
        { status: 400 }
      );
    }

    const schema = await getTableSchema(tableName);
    return NextResponse.json({ success: true, schema, demoMode: !process.env.DATABASE_URL });
  } catch (error) {
    console.error('Schema fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table schema', details: String(error), demoMode: true },
      { status: 200 }
    );
  }
}
