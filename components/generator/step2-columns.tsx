'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { TableInfo, ColumnInfo } from '@/lib/db';
import { ColumnConfig, getInputTypeFromDatabase } from '@/lib/codeGenerator';
import { useState } from 'react';

interface Step2Props {
  table: TableInfo;
  onColumnsUpdate: (columns: ColumnConfig[]) => void;
}

export function Step2Columns({ table, onColumnsUpdate }: Step2Props) {
  const [columns, setColumns] = useState<ColumnConfig[]>(
    table.columns.map(col => ({
      ...col,
      label: col.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      inputType: getInputTypeFromDatabase(col.type),
      required: !col.nullable && !col.isPrimaryKey,
      displayInList: !col.isPrimaryKey && col.type.toLowerCase().includes('varchar' || 'text'),
      selectOptions: [],
    }))
  );

  const handleColumnUpdate = (index: number, updates: Partial<ColumnConfig>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    setColumns(updated);
    onColumnsUpdate(updated);
  };

  const inputTypes = ['text', 'email', 'password', 'textarea', 'date', 'select', 'checkbox', 'number'] as const;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Configure Columns</CardTitle>
        <CardDescription>Customize how each column appears in your CRUD interface</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-96 overflow-y-auto">
        {columns.map((col, idx) => (
          <div key={col.name} className="border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="font-semibold text-slate-900">{col.name}</div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor={`label-${idx}`}>Display Label</FieldLabel>
                <Input
                  id={`label-${idx}`}
                  value={col.label}
                  onChange={e => handleColumnUpdate(idx, { label: e.target.value })}
                  className="border-slate-200"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={`type-${idx}`}>Input Type</FieldLabel>
                <Select value={col.inputType} onValueChange={value => handleColumnUpdate(idx, { inputType: value as any })}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inputTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`required-${idx}`}
                  checked={col.required}
                  disabled={col.isPrimaryKey}
                  onCheckedChange={checked => handleColumnUpdate(idx, { required: checked as boolean })}
                />
                <label htmlFor={`required-${idx}`} className="text-sm text-slate-600 cursor-pointer">
                  Required Field
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`display-${idx}`}
                  checked={col.displayInList}
                  disabled={col.isPrimaryKey}
                  onCheckedChange={checked => handleColumnUpdate(idx, { displayInList: checked as boolean })}
                />
                <label htmlFor={`display-${idx}`} className="text-sm text-slate-600 cursor-pointer">
                  Show in List
                </label>
              </div>
            </div>

            {col.isPrimaryKey && (
              <div className="text-sm bg-blue-50 border border-blue-200 p-2 rounded text-blue-700">
                Primary Key - Cannot be modified in forms
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
