import { Pool } from 'pg';

let pool: Pool | null = null;

function initializePool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey: string | null;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isForeignKey: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export async function getTables(): Promise<TableInfo[]> {
  const connectionPool = initializePool();
  
  if (!connectionPool) {
    return getDemoTables();
  }

  try {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await connectionPool.query(query);
    const tables: TableInfo[] = [];

    for (const row of result.rows) {
      const tableInfo = await getTableSchema(row.table_name);
      tables.push(tableInfo);
    }

    return tables;
  } catch (error) {
    console.warn('Database query failed, using demo tables:', error);
    return getDemoTables();
  }
}

export async function getTableSchema(tableName: string): Promise<TableInfo> {
  const connectionPool = initializePool();
  
  if (!connectionPool) {
    return getDemoTable(tableName);
  }

  try {
    // Get columns
    const columnsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.udt_name
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = $1
      ORDER BY c.ordinal_position;
    `;

    const columnsResult = await connectionPool.query(columnsQuery, [tableName]);

    // Get primary key - FIXED: use i.indrelid instead of i.indrelname
    const pkQuery = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid
        AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass
        AND i.indisprimary;
    `;

    const pkResult = await connectionPool.query(pkQuery, [tableName]);
    const primaryKey = pkResult.rows.length > 0 ? pkResult.rows[0].attname : null;

    // Get unique constraints - FIXED: use conrelid properly
    const uniqueQuery = `
      SELECT DISTINCT a.attname
      FROM pg_constraint con
      JOIN pg_attribute a ON a.attrelid = con.conrelid
        AND a.attnum = ANY(con.conkey)
      WHERE con.conrelid = $1::regclass
        AND con.contype = 'u';
    `;

    const uniqueResult = await connectionPool.query(uniqueQuery, [tableName]);
    const uniqueColumns = new Set(uniqueResult.rows.map(r => r.attname));

    // Get foreign keys - FIXED: properly handle schema and table names
    const fkQuery = `
      SELECT 
        a.attname as column_name,
        c.relname as foreign_table,
        af.attname as foreign_column
      FROM pg_constraint con
      JOIN pg_attribute a ON a.attrelid = con.conrelid
        AND a.attnum = ANY(con.conkey)
      JOIN pg_class c ON c.oid = con.confrelid
      JOIN pg_attribute af ON af.attrelid = con.confrelid
        AND af.attnum = ANY(con.confkey)
      WHERE con.conrelid = $1::regclass
        AND con.contype = 'f';
    `;

    const fkResult = await connectionPool.query(fkQuery, [tableName]);
    const foreignKeys = new Map(
      fkResult.rows.map(r => [
        r.column_name,
        { table: r.foreign_table, column: r.foreign_column }
      ])
    );

    const columns: ColumnInfo[] = columnsResult.rows.map(col => {
      const fk = foreignKeys.get(col.column_name);
      return {
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        isPrimaryKey: col.column_name === primaryKey,
        isUnique: uniqueColumns.has(col.column_name),
        isForeignKey: !!fk,
        foreignKeyTable: fk?.table,
        foreignKeyColumn: fk?.column,
      };
    });

    return {
      name: tableName,
      schema: 'public',
      columns,
      primaryKey,
    };
  } catch (error) {
    console.warn(`Failed to fetch schema for table ${tableName}, using demo table:`, error);
    return getDemoTable(tableName);
  }
}

export async function testConnection(): Promise<boolean> {
  const connectionPool = initializePool();
  
  if (!connectionPool) {
    console.info('No DATABASE_URL set, using demo mode');
    return true;
  }

  try {
    const result = await connectionPool.query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    console.warn('Database connection failed, using demo mode:', error);
    return true;
  }
}

function getDemoTables(): TableInfo[] {
  return [
    getDemoTable('users'),
    getDemoTable('products'),
    getDemoTable('orders'),
  ];
}

function getDemoTable(tableName: string): TableInfo {
  const demoSchemas: Record<string, TableInfo> = {
    users: {
      name: 'users',
      schema: 'public',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'integer', nullable: false, default: null, isPrimaryKey: true, isUnique: true, isForeignKey: false },
        { name: 'email', type: 'text', nullable: false, default: null, isPrimaryKey: false, isUnique: true, isForeignKey: false },
        { name: 'name', type: 'text', nullable: false, default: null, isPrimaryKey: false, isUnique: false, isForeignKey: false },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()', isPrimaryKey: false, isUnique: false, isForeignKey: false },
      ],
    },
    products: {
      name: 'products',
      schema: 'public',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'integer', nullable: false, default: null, isPrimaryKey: true, isUnique: true, isForeignKey: false },
        { name: 'name', type: 'text', nullable: false, default: null, isPrimaryKey: false, isUnique: false, isForeignKey: false },
        { name: 'price', type: 'numeric', nullable: false, default: null, isPrimaryKey: false, isUnique: false, isForeignKey: false },
        { name: 'description', type: 'text', nullable: true, default: null, isPrimaryKey: false, isUnique: false, isForeignKey: false },
        { name: 'stock', type: 'integer', nullable: false, default: '0', isPrimaryKey: false, isUnique: false, isForeignKey: false },
      ],
    },
    orders: {
      name: 'orders',
      schema: 'public',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'integer', nullable: false, default: null, isPrimaryKey: true, isUnique: true, isForeignKey: false },
        { name: 'user_id', type: 'integer', nullable: false, default: null, isPrimaryKey: false, isUnique: false, isForeignKey: true, foreignKeyTable: 'users', foreignKeyColumn: 'id' },
        { name: 'total', type: 'numeric', nullable: false, default: null, isPrimaryKey: false, isUnique: false, isForeignKey: false },
        { name: 'status', type: 'text', nullable: false, default: "'pending'", isPrimaryKey: false, isUnique: false, isForeignKey: false },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()', isPrimaryKey: false, isUnique: false, isForeignKey: false },
      ],
    },
  };

  return demoSchemas[tableName] || demoSchemas.users;
}