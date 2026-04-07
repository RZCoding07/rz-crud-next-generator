'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { Step1Database } from '@/components/generator/step1-database';
import { Step2Columns } from '@/components/generator/step2-columns';
import { Step3Features } from '@/components/generator/step3-features';
import { CodePreview } from '@/components/generator/code-preview';
import { TableInfo } from '@/lib/db';
import { ColumnConfig, GeneratorConfig } from '@/lib/codeGenerator';

export default function Home() {
  const [step, setStep] = useState(1);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [features, setFeatures] = useState({
    includeSearch: true,
    includeFilter: false,
    includePagination: true,
    includeExport: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);
  const { toast } = useToast();

  const handleTableSelect = (table: TableInfo) => {
    setSelectedTable(table);
    setColumns(
      table.columns.map(col => ({
        ...col,
        label: col.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        inputType: 'text' as const,
        required: !col.nullable && !col.isPrimaryKey,
        displayInList: !col.isPrimaryKey,
        selectOptions: [],
      }))
    );
    setStep(2);
  };

  const handleColumnsUpdate = (updatedColumns: ColumnConfig[]) => {
    setColumns(updatedColumns);
  };

  const handlePreview = async () => {
    if (!selectedTable) return;

    setIsGenerating(true);
    try {
      const config: GeneratorConfig = {
        table: selectedTable,
        columns,
        ...features,
      };

      const response = await fetch('/api/generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.success) {
        setPreviewFiles(data.files);
        setStep(4);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate preview',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedTable) return;

    setIsGenerating(true);
    try {
      const config: GeneratorConfig = {
        table: selectedTable,
        columns,
        ...features,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crud-${selectedTable.name}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Success',
          description: 'CRUD code generated and downloaded successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to generate code',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate code',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">RZ CRUD Generator</h1>
              <p className="text-slate-400 mt-1">
                Generate production-ready CRUD interfaces in seconds |{' '}
                <a 
                  href="https://github.com/RZCoding07/rz-crud-next-generator" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Check my GitHub
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-sm">Step {step}</span>
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {step === 1 && <Step1Database onTableSelect={handleTableSelect} isLoading={isGenerating} />}

        {step === 2 && selectedTable && (
          <div className="space-y-6">
            <Step2Columns table={selectedTable} onColumnsUpdate={handleColumnsUpdate} />
            <div className="flex gap-4 justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="border-slate-600">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700">
                Next: Features
              </Button>
            </div>
          </div>
        )}

        {step === 3 && selectedTable && (
          <div className="space-y-6">
            <Step3Features features={features} onFeaturesUpdate={setFeatures} />
            <div className="flex gap-4 justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="border-slate-600">
                Back
              </Button>
              <Button onClick={handlePreview} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
                {isGenerating ? <Spinner /> : 'Preview Code'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && previewFiles.length > 0 && (
          <div className="space-y-6">
            <CodePreview files={previewFiles} />
            <div className="flex gap-4 justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="border-slate-600">
                Back to Config
              </Button>
              <Button onClick={handleDownload} disabled={isGenerating} size="lg" className="bg-green-600 hover:bg-green-700">
                {isGenerating ? <Spinner /> : 'Download ZIP'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}