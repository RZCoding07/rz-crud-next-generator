import { GeneratorConfig, toCamelCase, toPascalCase } from './codeGenerator';
import {
  generateTypes,
  generateZodSchema,
  generateActions,
  generateAPIRoute,
  generateMainPage,
  generateForm,
} from './codeGenerator';

export interface FileContent {
  path: string;
  content: string;
}

export function generateAllFiles(config: GeneratorConfig): FileContent[] {
  const camelCaseName = toCamelCase(config.table.name);
  const pascalCaseName = toPascalCase(config.table.name);

  return [
    {
      path: `types/${camelCaseName}.ts`,
      content: generateTypes(config),
    },
    {
      path: `lib/validators/${camelCaseName}.ts`,
      content: generateZodSchema(config),
    },
    {
      path: `app/actions/${camelCaseName}.ts`,
      content: generateActions(config),
    },
    {
      path: `app/api/${camelCaseName}/route.ts`,
      content: generateAPIRoute(config),
    },
    {
      path: `app/${camelCaseName}/page.tsx`,
      content: generateMainPage(config),
    },
    {
      path: `app/${camelCaseName}/${camelCaseName}-form.tsx`,
      content: generateForm(config),
    },
    {
      path: `README.md`,
      content: generateReadme(config),
    },
  ];
}

function generateReadme(config: GeneratorConfig): string {
  const tableName = config.table.name;
  const camelCaseName = toCamelCase(tableName);

  return `# ${config.table.name} CRUD Application

Generated with CRUD Generator for Next.js

## Setup

1. Install dependencies:
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

2. Set up your environment variables in \`.env.local\`:
\`\`\`
DATABASE_URL=postgresql://user:password@localhost:5432/database
\`\`\`

3. Run migrations (if needed):
\`\`\`bash
npx prisma migrate dev
\`\`\`

4. Generate Prisma client:
\`\`\`bash
npx prisma generate
\`\`\`

## Running the Application

\`\`\`bash
npm run dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

- **CRUD Operations**: Create, Read, Update, and Delete ${tableName} records
${config.includeSearch ? '- **Search**: Real-time search across records' : ''}
${config.includeFilter ? '- **Filtering**: Filter records by column values' : ''}
${config.includePagination ? '- **Pagination**: Navigate through records with pagination' : ''}
${config.includeExport ? '- **Export**: Export records to CSV format' : ''}

## API Routes

### GET /api/${camelCaseName}
Fetch ${tableName} records with optional filters, sorting, and pagination.

Query parameters:
- \`page\` (number): Page number (default: 1)
- \`pageSize\` (number): Items per page (default: 10)
- \`search\` (string): Search query
- \`sortBy\` (string): Column to sort by
- \`sortOrder\` (string): 'asc' or 'desc'
- \`id\` (number/string): Fetch specific record by ID

### POST /api/${camelCaseName}
Create a new ${tableName} record.

### PUT /api/${camelCaseName}
Update an existing ${tableName} record.

### DELETE /api/${camelCaseName}
Delete a ${tableName} record.

Query parameters:
- \`id\` (number/string): ID of the record to delete

## File Structure

\`\`\`
app/
├── ${camelCaseName}/
│   ├── page.tsx           # Main CRUD page
│   └── ${camelCaseName}-form.tsx  # Form component for create/edit
├── actions/
│   └── ${camelCaseName}.ts        # Server actions
└── api/
    └── ${camelCaseName}/
        └── route.ts        # API routes

types/
└── ${camelCaseName}.ts    # TypeScript types

lib/
├── validators/
│   └── ${camelCaseName}.ts # Zod validation schema
└── db.ts               # Database utilities
\`\`\`

## Generated Columns

${config.columns.map(col => `- **${col.name}** (${col.type})${col.nullable ? ' - Optional' : ' - Required'}`).join('\n')}

## Support

For issues or questions, please refer to the [Next.js documentation](https://nextjs.org/docs).
`;
}

export async function createZipBlob(files: FileContent[]): Promise<Blob> {
  // Dynamic import to avoid issues on client side
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  files.forEach(file => {
    zip.file(file.path, file.content);
  });

  return zip.generateAsync({ type: 'blob' });
}
