'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface File {
  path: string;
  content: string;
}

interface CodePreviewProps {
  files: File[];
}

export function CodePreview({ files }: CodePreviewProps) {
  const [selectedFile, setSelectedFile] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentFile = files[selectedFile];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Generated Code Preview</CardTitle>
        <CardDescription>Review your generated CRUD code before downloading</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700">
            <TabsTrigger value="files" className="text-slate-200">Files</TabsTrigger>
            <TabsTrigger value="preview" className="text-slate-200">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4 mt-4">
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {files.map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(idx)}
                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                    selectedFile === idx
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="font-mono text-sm text-slate-200">{file.path}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {file.content.split('\n').length} lines
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            {currentFile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-slate-300">{currentFile.path}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="border-slate-600 text-slate-200 hover:bg-slate-700"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <pre className="p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap break-words">
                    {currentFile.content}
                  </pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-4 border-t border-slate-600">
          <div>Total Files: {files.length}</div>
          <div>Total Lines: {files.reduce((sum, f) => sum + f.content.split('\n').length, 0)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
