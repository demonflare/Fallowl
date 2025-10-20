import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Contact, InsertContact } from '@shared/schema';
import { normalizePhoneNumber, arePhoneNumbersEqual } from '@/utils/phoneUtils';

export const useContacts = () => {
  return useQuery({
    queryKey: ['/api/contacts'],
    staleTime: 30000, // Cache for 30 seconds
  });
};

export const useContactByPhone = (phone: string | null) => {
  const { data: contacts } = useContacts();
  
  if (!phone || !contacts || !Array.isArray(contacts)) return null;
  
  // Use smart phone matching
  return contacts.find((contact: Contact) => {
    return arePhoneNumbersEqual(phone, contact.phone);
  }) || null;
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contactData: InsertContact) => {
      const response = await apiRequest('POST', '/api/contacts', contactData);
      return response.json();
    },
    onSuccess: (newContact) => {
      // Optimistic update
      queryClient.setQueryData(['/api/contacts'], (oldContacts: Contact[] = []) => [
        ...oldContacts,
        newContact
      ]);
      
      toast({
        title: "Contact Saved",
        description: "Contact has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
        variant: "destructive"
      });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertContact> }) => {
      const response = await apiRequest('PATCH', `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedContact, { id }) => {
      // Optimistic update
      queryClient.setQueryData(['/api/contacts'], (oldContacts: Contact[] = []) =>
        oldContacts.map(contact => 
          contact.id === id ? { ...contact, ...updatedContact } : contact
        )
      );
      
      toast({
        title: "Contact Updated",
        description: "Contact has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive"
      });
    },
  });
};

export const useUpsertContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contactData: InsertContact) => {
      const response = await apiRequest('POST', '/api/contacts/upsert', contactData);
      return response.json();
    },
    onSuccess: (contact) => {
      // Invalidate all contact-related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/call-notes'] });
      
      toast({
        title: "Contact Saved",
        description: "Contact has been saved successfully",
      });
      
      return contact;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
        variant: "destructive"
      });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/contacts/${id}`);
      return response.json();
    },
    onSuccess: (_, id) => {
      // Invalidate all contact-related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/call-notes'] });
      
      toast({
        title: "Contact Deleted",
        description: "Contact has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive"
      });
    },
  });
};