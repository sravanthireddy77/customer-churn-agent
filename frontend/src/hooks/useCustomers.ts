/**
 * useCustomers Hook
 *
 * Custom hook for managing customer list state and operations.
 * Handles loading, filtering, and state updates.
 */

import { useState, useCallback, useMemo } from "react";
import { CustomerStatus, LegacyCustomer } from "../types";
import { mockCustomers, filterCustomers } from "../data/mockCustomers";

export const useCustomers = () => {
  // State management
  const [customers, setCustomers] = useState<LegacyCustomer[]>(mockCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [issueFilter, setIssueFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Memoize filtered customers to avoid re-filtering on every render
  const filteredCustomers = useMemo(() => {
    return filterCustomers(customers, searchTerm, riskFilter, issueFilter);
  }, [customers, searchTerm, riskFilter, issueFilter]);

  /**
   * Update customer status (e.g., Contacted, Rescued)
   */
  const updateCustomerStatus = useCallback(
    (customerId: number, newStatus: CustomerStatus) => {
      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) =>
          customer.id === customerId
            ? { ...customer, status: newStatus }
            : customer,
        ),
      );
    },
    [],
  );

  /**
   * Reset all filters and search
   */
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setRiskFilter("ALL");
    setIssueFilter("ALL");
  }, []);

  /**
   * Load customers (simulates API call)
   * In Phase 2, replace with real API call
   */
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      // In real implementation: const response = await fetch('/api/customers');
      setCustomers(mockCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    customers,
    filteredCustomers,
    searchTerm,
    riskFilter,
    issueFilter,
    isLoading,

    // Setters
    setSearchTerm,
    setRiskFilter,
    setIssueFilter,

    // Actions
    updateCustomerStatus,
    resetFilters,
    loadCustomers,
  };
};
