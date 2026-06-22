/**
 * API hooks backed by the FastAPI service.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type {
  AgentRunRequest,
  AgentRunResponse,
  CampaignEvent,
  CampaignTriggerRequest,
  ChurnAnalysis,
  ChurnAnalysisRecord,
  Customer,
  CustomerSignalInput,
  Task,
  TaskCreate,
  TaskStatus,
} from '../types';

export const queryKeys = {
  customers: ['customers'] as const,
  customer: (customerId: string) => ['customers', customerId] as const,
  analyses: ['analyses'] as const,
  analysis: (customerId: string) => ['analyses', customerId] as const,
  tasks: (customerId?: string | null) =>
    customerId ? (['tasks', customerId] as const) : (['tasks'] as const),
};

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async () => (await api.get<Customer[]>('/customers')).data,
    staleTime: 1000 * 60,
  });
}

export function useCustomer(customerId?: string | null) {
  return useQuery({
    queryKey: customerId ? queryKeys.customer(customerId) : ['customers', 'disabled'],
    enabled: Boolean(customerId),
    queryFn: async () => (await api.get<Customer>(`/customers/${customerId}`)).data,
    staleTime: 1000 * 60,
  });
}

export function useAnalyses() {
  return useQuery({
    queryKey: queryKeys.analyses,
    queryFn: async () => (await api.get<ChurnAnalysisRecord[]>('/churn/results')).data,
    staleTime: 1000 * 30,
  });
}

export function useAnalysis(customerId?: string | null) {
  return useQuery({
    queryKey: customerId ? queryKeys.analysis(customerId) : ['analyses', 'disabled'],
    enabled: Boolean(customerId),
    queryFn: async () =>
      (await api.get<ChurnAnalysisRecord>(`/churn/results/${customerId}`)).data,
    retry: false,
    staleTime: 1000 * 30,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.analysis(analysis.customer_id),
      });
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

export function useTasks(customerId?: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks(customerId),
    queryFn: async () =>
      (
        await api.get<Task[]>('/tasks', {
          params: customerId ? { customer_id: customerId } : undefined,
        })
      ).data,
    staleTime: 1000 * 30,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskCreate) =>
      (await api.post<Task>('/tasks', payload)).data,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(task.customer_id),
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => (await api.put<Task>(`/tasks/${taskId}`, { status })).data,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks(task.customer_id),
      });
    },
  });
}

export function useTriggerCampaign() {
  return useMutation({
    mutationFn: async (payload: CampaignTriggerRequest) =>
      (await api.post<CampaignEvent>('/campaigns/trigger', payload)).data,
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
