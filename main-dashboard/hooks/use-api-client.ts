"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export function useApiClient() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      // Retrieve the Clerk session token
      const token = await getToken();

      const headers = new Headers(options.headers || {});
      headers.set("Content-Type", "application/json");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || `Request failed with status ${res.status}`);
      }

      return res.json();
    },
    [getToken]
  );

  return { apiFetch };
}