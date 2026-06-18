import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import {
  CampaignEvent,
  AgentRunRequest,
  AgentRunResponse,
  ChurnAnalysis,
  ChurnAnalysisRecord,
  Customer,
  CustomerSignalInput,
  Task,
  TaskStatus,
} from '../types';

export const queryKeys = {
  customers: ['customers'] as const,
  customer: (customerId: string) => ['customer', customerId] as const,
  analyses: ['analyses'] as const,
  analysis: (customerId: string) => ['analysis', customerId] as const,
  tasks: (customerId?: string) => ['tasks', customerId ?? 'all'] as const,
  agent: ['agent'] as const,
};

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async () => (await api.get<Customer[]>('/customers')).data,
  });
}

export function useCustomer(customerId?: string) {
  return useQuery({
    queryKey: queryKeys.customer(customerId ?? ''),
    enabled: Boolean(customerId),
    queryFn: async () => (await api.get<Customer>(`/customers/${customerId}`)).data,
  });
}

export function useAnalyses() {
  return useQuery({
    queryKey: queryKeys.analyses,
    queryFn: async () => (await api.get<ChurnAnalysisRecord[]>('/churn/results')).data,
  });
}

export function useAnalysis(customerId?: string) {
  return useQuery({
    queryKey: queryKeys.analysis(customerId ?? ''),
    enabled: Boolean(customerId),
    retry: false,
    queryFn: async () => (await api.get<ChurnAnalysisRecord>(`/churn/results/${customerId}`)).data,
  });
}

export function useTasks(customerId?: string) {
  return useQuery({
    queryKey: queryKeys.tasks(customerId),
    queryFn: async () =>
      (await api.get<Task[]>('/tasks', { params: customerId ? { customer_id: customerId } : {} })).data,
  });
}

export function useAnalyzeCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomerSignalInput) =>
      (await api.post<ChurnAnalysis>('/churn/analyze', payload)).data,
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      queryClient.invalidateQueries({ queryKey: queryKeys.analyses });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(analysis.customer_id) });
    },
  });
}

export function useAnalyzeBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customers: CustomerSignalInput[]) =>
      (await api.post<ChurnAnalysis[]>('/churn/analyze-batch', { customers })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      queryClient.invalidateQueries({ queryKey: queryKeys.analyses });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Task>) => (await api.post<Task>('/tasks', payload)).data,
    onSuccess: (_, task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      if (task.customer_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks(task.customer_id) });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      (await api.put<Task>(`/tasks/${taskId}`, { status })).data,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(task.customer_id) });
    },
  });
}

export function useTriggerCampaign() {
  return useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      campaign_type: string;
      payload: Record<string, unknown>;
    }) => (await api.post<CampaignEvent>('/campaigns/trigger', payload)).data,
  });
}

export function useRunAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AgentRunRequest) =>
      (await api.post<AgentRunResponse>('/agent/run', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      queryClient.invalidateQueries({ queryKey: queryKeys.analyses });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
}
