'use client';

import { useState, useCallback } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { Workflow } from '@repo/types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  existingWorkflows: Workflow[];
}

interface FilePreview {
  file: File;
  name: string;
  nodeCount: number;
  status: 'valid' | 'invalid' | 'conflict';
  error?: string;
  renameTo?: string;
}

interface ImportResult {
  name: string;
  status: 'imported' | 'skipped' | 'error';
  error?: string;
}

export function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  existingWorkflows,
}: BulkImportModalProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [stage, setStage] = useState<'select' | 'preview' | 'result'>('select');

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const previews: FilePreview[] = [];

    for (const file of selectedFiles) {
      if (!file.name.endsWith('.json')) {
        previews.push({
          file,
          name: file.name,
          nodeCount: 0,
          status: 'invalid',
          error: 'File must be .json',
        });
        continue;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate shape
        if (!data.name || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          previews.push({
            file,
            name: file.name,
            nodeCount: 0,
            status: 'invalid',
            error: 'Missing required fields: name, nodes, edges',
          });
          continue;
        }

        // Check for conflicts
        const conflict = existingWorkflows.some((w) => w.name === data.name);
        previews.push({
          file,
          name: data.name,
          nodeCount: data.nodes.length,
          status: conflict ? 'conflict' : 'valid',
          error: conflict ? 'Workflow with this name already exists' : undefined,
        });
      } catch (err: any) {
        previews.push({
          file,
          name: file.name,
          nodeCount: 0,
          status: 'invalid',
          error: err.message || 'Invalid JSON',
        });
      }
    }

    setFiles(previews);
    setStage('preview');
  }, [existingWorkflows]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    const importResults: ImportResult[] = [];

    for (const preview of files) {
      if (preview.status === 'invalid') {
        importResults.push({
          name: preview.name,
          status: 'skipped',
          error: preview.error,
        });
        continue;
      }

      try {
        const text = await preview.file.text();
        const data = JSON.parse(text);

        const payload = {
          name: preview.renameTo || data.name,
          type: data.type || 'Application',
          description: data.description || '',
          nodes: data.nodes,
          edges: data.edges,
          applicationId,
        };

        await apiClient.post('/workflows', payload);
        importResults.push({
          name: preview.renameTo || data.name,
          status: 'imported',
        });
      } catch (err: any) {
        importResults.push({
          name: preview.renameTo || preview.name,
          status: 'error',
          error: err.message || 'Import failed',
        });
      }
    }

    setResults(importResults);
    setStage('result');
    setImporting(false);
  }, [files, applicationId]);

  const handleRename = (index: number, newName: string) => {
    const updated = [...files];
    updated[index].renameTo = newName || undefined;
    setFiles(updated);
  };

  const importedCount = results.filter((r) => r.status === 'imported').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-gray-900 shadow-xl max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {stage === 'select' && 'Import Workflows'}
            {stage === 'preview' && 'Preview & Configure'}
            {stage === 'result' && 'Import Results'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {stage === 'select' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <label className="cursor-pointer">
                <span className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Click to select
                </span>
                <input
                  type="file"
                  multiple
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                or drag and drop JSON workflow files
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Each file must contain: name, nodes[], edges[]
            </p>
          </div>
        )}

        {stage === 'preview' && (
          <div className="space-y-3">
            {files.map((file, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {file.status === 'invalid' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {file.status === 'valid' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {file.status === 'conflict' && <Clock className="h-4 w-4 text-amber-600" />}
                      {file.status === 'conflict' ? (
                        <input
                          type="text"
                          defaultValue={file.name}
                          onChange={(e) => handleRename(idx, e.target.value)}
                          placeholder="New name (e.g., Workflow_imported)"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                      )}
                    </div>
                    {file.status === 'invalid' && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                    {file.status === 'conflict' && (
                      <p className="text-xs text-amber-600 mt-1">Workflow name exists — rename to import</p>
                    )}
                    {file.status === 'valid' && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{file.nodeCount} nodes</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setStage('select')}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!files.some((f) => f.status !== 'invalid')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                Import {files.filter((f) => f.status !== 'invalid').length}
              </button>
            </div>
          </div>
        )}

        {stage === 'result' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importedCount}</p>
                <p className="text-xs text-green-700 dark:text-green-300">Imported</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{skippedCount}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Skipped</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-xs text-red-700 dark:text-red-300">Errors</p>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  {result.status === 'imported' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {result.status === 'skipped' && <AlertCircle className="h-4 w-4 text-amber-600" />}
                  {result.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  <span>
                    {result.name}{result.error && ` — ${result.error}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  onClose();
                  onSuccess();
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
