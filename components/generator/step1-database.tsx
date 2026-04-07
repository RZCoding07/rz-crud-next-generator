'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TableInfo } from '@/lib/db';

interface Step1Props {
  onTableSelect: (table: TableInfo) => void;
  isLoading?: boolean;
}

export function Step1Database({ onTableSelect, isLoading = false }: Step1Props) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/introspect');
        const data = await response.json();

        setDemoMode(data.demoMode || false);
        
        if (data.tables) {
          setTables(data.tables);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to load database tables');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Database Tables</CardTitle>
          <CardDescription>Loading your database schema...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {demoMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Demo Mode</CardTitle>
            <CardDescription className="text-blue-800">
              No DATABASE_URL configured. Using sample tables for demonstration. Connect a real PostgreSQL database to introspect your actual schema.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Select a Table</CardTitle>
          <CardDescription>Choose a table from your database to generate CRUD interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        {tables.length === 0 ? (
          <p className="text-slate-500">No tables found in your database</p>
        ) : (
          <div className="grid gap-3">
            {tables.map(table => (
              <button
                key={table.name}
                onClick={() => onTableSelect(table)}
                disabled={isLoading}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-slate-900">{table.name}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {table.columns.length} columns
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
}
