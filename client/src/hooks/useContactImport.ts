import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    data: any;
    errors: string[];
  }>;
  duplicatesHandled: number;
  listId?: number;
}

export interface ImportOptions {
  skipDuplicates: boolean;
  updateDuplicates: boolean;
  createList: boolean;
  listName?: string;
  listDescription?: string;
}

export const useParseCsv = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (csvContent: string) => {
      const response = await apiRequest('POST', '/api/contacts/import/parse', { csvContent });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Parse Error",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive"
      });
    }
  });
};

export const useImportPreview = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ csvContent, fieldMappings }: { 
      csvContent: string; 
      fieldMappings: { [csvField: string]: string }; 
    }) => {
      const response = await apiRequest('POST', '/api/contacts/import/preview', { csvContent, fieldMappings });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Preview Error",
        description: error.message || "Failed to generate preview",
        variant: "destructive"
      });
    }
  });
};

export const useExecuteImport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      csvContent, 
      fieldMappings, 
      options 
    }: {
      csvContent: string;
      fieldMappings: { [csvField: string]: string };
      options: ImportOptions;
    }): Promise<ImportResult> => {
      const response = await apiRequest('POST', '/api/contacts/import/execute', { csvContent, fieldMappings, options });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      // Invalidate contacts cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      
      // Invalidate contact lists if a new list was created
      if (result.listId) {
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      }

      if (result.success) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.importedCount} contacts`
        });
      } else {
        toast({
          title: "Import Issues",
          description: `Imported ${result.importedCount} contacts with ${result.errorCount} errors`,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import contacts",
        variant: "destructive"
      });
    }
  });
};