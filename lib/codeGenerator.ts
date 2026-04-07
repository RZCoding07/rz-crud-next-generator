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

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey: string | null;
}

export interface ColumnConfig extends ColumnInfo {
  label: string;
  inputType: 'text' | 'email' | 'password' | 'textarea' | 'date' | 'select' | 'checkbox' | 'number';
  required: boolean;
  displayInList: boolean;
  selectOptions?: { value: string; label: string }[];
}

export interface GeneratorConfig {
  table: TableInfo;
  columns: ColumnConfig[];
  includeSearch: boolean;
  includeFilter: boolean;
  includePagination: boolean;
  includeExport: boolean;
}

export function getInputTypeFromDatabase(type: string): 'text' | 'email' | 'password' | 'textarea' | 'date' | 'select' | 'checkbox' | 'number' {
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('email')) return 'email';
  if (lowerType.includes('password')) return 'password';
  if (lowerType.includes('text') || lowerType.includes('varchar')) return 'text';
  if (lowerType.includes('date')) return 'date';
  if (lowerType.includes('boolean')) return 'checkbox';
  if (lowerType.includes('integer') || lowerType.includes('numeric') || lowerType.includes('bigint')) return 'number';
  
  return 'text';
}

export function generateTypes(config: GeneratorConfig): string {
  const tableName = config.table.name;
  const pascalCaseName = toPascalCase(tableName);
  
  const columnTypes = config.columns
    .map(col => {
      let type = 'string';
      const dbType = col.type.toLowerCase();
      
      if (dbType.includes('integer') || dbType.includes('bigint') || dbType.includes('smallint')) {
        type = 'number';
      } else if (dbType.includes('boolean')) {
        type = 'boolean';
      } else if (dbType.includes('date') || dbType.includes('timestamp')) {
        type = 'Date | string';
      } else if (dbType.includes('numeric') || dbType.includes('decimal')) {
        type = 'number';
      }
      
      const optional = col.nullable ? '?' : '';
      return `  ${col.name}${optional}: ${type};`;
    })
    .join('\n');

  return `export interface ${pascalCaseName} {
${columnTypes}
}

export interface ${pascalCaseName}Input {
${config.columns
  .filter(col => !col.isPrimaryKey)
  .map(col => {
    let type = 'string';
    const dbType = col.type.toLowerCase();
    
    if (dbType.includes('integer') || dbType.includes('bigint') || dbType.includes('smallint')) {
      type = 'number';
    } else if (dbType.includes('boolean')) {
      type = 'boolean';
    } else if (dbType.includes('date') || dbType.includes('timestamp')) {
      type = 'string';
    } else if (dbType.includes('numeric') || dbType.includes('decimal')) {
      type = 'number';
    }
    
    const optional = col.nullable ? '?' : '';
    return `  ${col.name}${optional}: ${type};`;
  })
  .join('\n')}
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}`;
}

export function generateZodSchema(config: GeneratorConfig): string {
  const pascalCaseName = toPascalCase(config.table.name);
  
  const schemaFields = config.columns
    .filter(col => !col.isPrimaryKey)
    .map(col => {
      let validation = 'z.string()';
      const dbType = col.type.toLowerCase();
      
      if (dbType.includes('integer') || dbType.includes('bigint') || dbType.includes('smallint')) {
        validation = 'z.number().int()';
      } else if (dbType.includes('boolean')) {
        validation = 'z.boolean()';
      } else if (dbType.includes('numeric') || dbType.includes('decimal')) {
        validation = 'z.number()';
      }
      
      if (col.inputType === 'email') {
        validation += '.email()';
      } else if (col.inputType === 'number') {
        validation = 'z.number()';
      }
      
      if (!col.required || col.nullable) {
        validation += '.optional()';
      } else {
        validation += '.min(1, "This field is required")';
      }
      
      return `  ${col.name}: ${validation},`;
    })
    .join('\n');

  return `import { z } from 'zod';

export const ${toCamelCase(config.table.name)}Schema = z.object({
${schemaFields}
});

export type ${pascalCaseName}Input = z.infer<typeof ${toCamelCase(config.table.name)}Schema>;`;
}

export function generateActions(config: GeneratorConfig): string {
  const tableName = config.table.name;
  const camelCaseName = toCamelCase(tableName);
  const pascalCaseName = toPascalCase(tableName);
  const pkColumn = config.columns.find(c => c.isPrimaryKey);
  const pkName = pkColumn?.name || 'id';

  const createColumns = config.columns
    .filter(col => !col.isPrimaryKey)
    .map(col => `    ${col.name}: data.${col.name},`)
    .join('\n');

  const updateColumns = config.columns
    .filter(col => !col.isPrimaryKey)
    .map(col => `      ${col.name}: data.${col.name},`)
    .join('\n');

  return `'use server';

import { prisma } from '@/lib/prisma';
import { ${pascalCaseName}Input } from '@/types/${camelCaseName}';

export async function create${pascalCaseName}(data: ${pascalCaseName}Input) {
  try {
    const result = await prisma.${camelCaseName}.create({
      data: {
${createColumns}
      },
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error creating ${camelCaseName}:', error);
    return { success: false, error: 'Failed to create ${camelCaseName}' };
  }
}

export async function get${pascalCaseName}s(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const pageSize = params.pageSize || 10;
    const page = params.page || 1;
    const skip = (page - 1) * pageSize;

    let where: any = {};
    
    if (params.search) {
      const searchableColumns = ${JSON.stringify(config.columns.filter(c => !c.isPrimaryKey && (c.type.includes('varchar') || c.type.includes('text'))).map(c => c.name))};
      where = {
        OR: searchableColumns.map(field => ({
          [field]: { contains: params.search, mode: 'insensitive' }
        }))
      };
    }

    const [data, total] = await Promise.all([
      prisma.${camelCaseName}.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: params.sortBy ? { [params.sortBy]: params.sortOrder || 'asc' } : undefined,
      }),
      prisma.${camelCaseName}.count({ where }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Error fetching ${camelCaseName}s:', error);
    return { success: false, error: 'Failed to fetch ${camelCaseName}s' };
  }
}

export async function get${pascalCaseName}ById(id: string | number) {
  try {
    const result = await prisma.${camelCaseName}.findUnique({
      where: { ${pkName}: typeof id === 'string' ? parseInt(id) : id },
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching ${camelCaseName}:', error);
    return { success: false, error: 'Failed to fetch ${camelCaseName}' };
  }
}

export async function update${pascalCaseName}(id: string | number, data: Partial<${pascalCaseName}Input>) {
  try {
    const result = await prisma.${camelCaseName}.update({
      where: { ${pkName}: typeof id === 'string' ? parseInt(id) : id },
      data: {
${updateColumns}
      },
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating ${camelCaseName}:', error);
    return { success: false, error: 'Failed to update ${camelCaseName}' };
  }
}

export async function delete${pascalCaseName}(id: string | number) {
  try {
    await prisma.${camelCaseName}.delete({
      where: { ${pkName}: typeof id === 'string' ? parseInt(id) : id },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting ${camelCaseName}:', error);
    return { success: false, error: 'Failed to delete ${camelCaseName}' };
  }
}`;
}

export function generateAPIRoute(config: GeneratorConfig): string {
  const camelCaseName = toCamelCase(config.table.name);
  const pascalCaseName = toPascalCase(config.table.name);

  return `import { NextRequest, NextResponse } from 'next/server';
import { 
  create${pascalCaseName}, 
  get${pascalCaseName}s, 
  get${pascalCaseName}ById, 
  update${pascalCaseName}, 
  delete${pascalCaseName} 
} from '@/app/actions/${camelCaseName}';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const result = await get${pascalCaseName}ById(id);
    return NextResponse.json(result);
  }

  const params = {
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '10'),
    search: searchParams.get('search') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
  };

  const result = await get${pascalCaseName}s(params);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await create${pascalCaseName}(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    const result = await update${pascalCaseName}(id, data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const result = await delete${pascalCaseName}(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}`;
}

export function generateMainPage(config: GeneratorConfig): string {
  const camelCaseName = toCamelCase(config.table.name);
  const pascalCaseName = toPascalCase(config.table.name);
  const displayColumns = config.columns.filter(c => c.displayInList).slice(0, 5);

  return `'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import useSWR from 'swr';
import ${pascalCaseName}Form from './${camelCaseName}-form';
import { ${pascalCaseName} } from '@/types/${camelCaseName}';
import { delete${pascalCaseName} } from '@/app/actions/${camelCaseName}';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ${pascalCaseName}Page() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: '10',
    ...(search && { search }),
    ...(sortBy && { sortBy, sortOrder }),
  });

  const { data, isLoading, mutate } = useSWR(\`/api/${camelCaseName}?\${params}\`, fetcher);

  const handleDelete = async () => {
    if (!deleteId) return;

    const result = await delete${pascalCaseName}(deleteId);
    if (result.success) {
      toast({ title: 'Success', description: '${pascalCaseName} deleted successfully' });
      mutate();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setDeleteId(null);
  };

  const handleExport = () => {
    if (!data?.data) return;
    
    const headers = ${JSON.stringify(displayColumns.map(c => c.label))};
    const rows = data.data.map((item: any) => [${displayColumns.map(c => `\${item['${c.name}']}`).join(', ')}]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => \`"\\\${cell}"\`).join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${camelCaseName}-export.csv';
    a.click();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">${pascalCaseName} Management</h1>
        <Button onClick={() => { setEditingId(null); setIsOpen(true); }}>Add ${pascalCaseName}</Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        ${config.includeExport ? '<Button variant="outline" onClick={handleExport}>Export CSV</Button>' : ''}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  ${displayColumns.map(col => '<TableHead onClick={() => { setSortBy(' + JSON.stringify(col.name) + '); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }} className="cursor-pointer">' + col.label + '</TableHead>').join('\n                  ')}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((item: ${pascalCaseName}) => (
                  <TableRow key={item.${config.columns.find(c => c.isPrimaryKey)?.name || 'id'}}>
                    ${displayColumns.map(col => '<TableCell>{item.' + col.name + '}</TableCell>').join('\n                    ')}
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(item.${config.columns.find(c => c.isPrimaryKey)?.name || 'id'} as any); setIsOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(item.${config.columns.find(c => c.isPrimaryKey)?.name || 'id'} as any)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          ${config.includePagination ? '<div className="flex justify-center gap-2 mt-6"><button onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-2 border rounded">Previous</button>{Array.from({ length: Math.min(5, data?.totalPages || 1) }).map((_, i) => (<button key={i + 1} onClick={() => setPage(i + 1)} className={page === i + 1 ? "px-3 py-2 bg-blue-500 text-white rounded" : "px-3 py-2 border rounded"}>{i + 1}</button>))}<button onClick={() => setPage(Math.min(data?.totalPages || 1, page + 1))} className="px-3 py-2 border rounded">Next</button></div>' : ''}
        </>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} ${pascalCaseName}</DialogTitle>
          </DialogHeader>
          <${pascalCaseName}Form
            editingId={editingId}
            onSuccess={() => { setIsOpen(false); mutate(); }}
            onClose={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ${pascalCaseName}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this ${camelCaseName}?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}`;
}

export function generateForm(config: GeneratorConfig): string {
  const camelCaseName = toCamelCase(config.table.name);
  const pascalCaseName = toPascalCase(config.table.name);

  const formFields = config.columns
    .filter(col => !col.isPrimaryKey)
    .map(col => {
      const inputComponentMap: Record<string, string> = {
        text: 'Input',
        email: 'Input',
        password: 'Input',
        number: 'Input',
        textarea: 'Textarea',
        date: 'Input',
        select: 'Select',
        checkbox: 'Checkbox',
      };

      const component = inputComponentMap[col.inputType] || 'Input';
      return `      <Field>
        <FieldLabel htmlFor="${col.name}">${col.label}</FieldLabel>
        <Controller
          name="${col.name}"
          control={control}
          render={({ field }) => (
            ${component === 'Textarea' ? '<Textarea {...field} placeholder="Enter ' + col.label.toLowerCase() + '" />' : component === 'Checkbox' ? '<Checkbox {...field} />' : component === 'Select' ? '<Select onValueChange={field.onChange} value={field.value || ""}><SelectTrigger><SelectValue placeholder="Select ' + col.label.toLowerCase() + '" /></SelectTrigger><SelectContent>' + (col.selectOptions?.map(opt => '<SelectItem value="' + opt.value + '">' + opt.label + '</SelectItem>').join('') || '') + '</SelectContent></Select>' : '<Input {...field} type="' + (col.inputType === 'textarea' ? 'text' : col.inputType) + '" placeholder="Enter ' + col.label.toLowerCase() + '" />'}
          )}
        />
        {errors.${col.name} && <p className="text-sm text-red-500">{errors.${col.name}?.message}</p>}
      </Field>`;
    })
    .join('\n');

  return `'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { ${pascalCaseName}Input, ${toCamelCase(config.table.name)}Schema } from '@/types/${camelCaseName}';
import { create${pascalCaseName}, update${pascalCaseName}, get${pascalCaseName}ById } from '@/app/actions/${camelCaseName}';
import { useEffect, useState } from 'react';

interface ${pascalCaseName}FormProps {
  editingId?: string | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ${pascalCaseName}Form({ editingId, onSuccess, onClose }: ${pascalCaseName}FormProps) {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<${pascalCaseName}Input>({
    resolver: zodResolver(${toCamelCase(config.table.name)}Schema),
  });
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingId) {
      setIsLoading(true);
      get${pascalCaseName}ById(editingId).then(result => {
        if (result.success && result.data) {
          reset(result.data);
        }
        setIsLoading(false);
      });
    }
  }, [editingId, reset]);

  const onSubmit = async (data: ${pascalCaseName}Input) => {
    try {
      const result = editingId
        ? await update${pascalCaseName}(editingId, data)
        : await create${pascalCaseName}(data);

      if (result.success) {
        toast({ title: 'Success', description: \`\${editingId ? 'Updated' : 'Created'} successfully\` });
        onSuccess?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center"><Spinner /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
${formFields}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : editingId ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}`;
}

export function toCamelCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, c => c.toLowerCase());
}

export function toPascalCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, c => c.toUpperCase());
}
