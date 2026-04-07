'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface Step3Props {
  features: {
    includeSearch: boolean;
    includeFilter: boolean;
    includePagination: boolean;
    includeExport: boolean;
  };
  onFeaturesUpdate: (features: any) => void;
}

export function Step3Features({ features, onFeaturesUpdate }: Step3Props) {
  const handleToggle = (key: string) => {
    onFeaturesUpdate({
      ...features,
      [key]: !features[key as keyof typeof features],
    });
  };

  const featuresList = [
    {
      id: 'includeSearch',
      label: 'Search Functionality',
      description: 'Add real-time search across records',
    },
    {
      id: 'includeFilter',
      label: 'Filter by Columns',
      description: 'Filter records by specific column values',
    },
    {
      id: 'includePagination',
      label: 'Pagination',
      description: 'Navigate through records with page numbers',
    },
    {
      id: 'includeExport',
      label: 'Export to CSV',
      description: 'Download records as CSV file',
    },
  ];

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Select Features</CardTitle>
        <CardDescription>Choose which features to include in your generated CRUD interface</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {featuresList.map(feature => (
          <div key={feature.id} className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Checkbox
              id={feature.id}
              checked={features[feature.id as keyof typeof features] || false}
              onCheckedChange={() => handleToggle(feature.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <label htmlFor={feature.id} className="font-semibold text-slate-900 cursor-pointer block">
                {feature.label}
              </label>
              <p className="text-sm text-slate-600 mt-1">{feature.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
