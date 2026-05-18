import { useEffect, useState, useMemo } from "react";
import type { CollectionOptions, ZerithDBApp } from "zerithdb-sdk";
import { useZerith } from "./useZerith";
import { useQuery } from "./useQuery";

/**
 * React hook for a schema-validated collection.
 * Provides the same API as useQuery but adds validation error state.
 */
export function useValidatedQuery<T extends Record<string, any>>(
  collectionName: string,
  options?: CollectionOptions<T>
) {
  const app = useZerith() as ZerithDBApp;
  const [validationErrors, setValidationErrors] = useState<
    Array<{ path: Array<string | number | symbol>; message: string }>
  >([]);

  // Get the schema-validated collection (registers schema on first call)
  const collection = useMemo(
    () => app.db<T>(collectionName, options),
    [app, collectionName, JSON.stringify(options?.validation?.mode)]
  );

  // Listen for remote validation errors from sync engine
  useEffect(() => {
    const handler = (event: {
      collectionName: string;
      issues: Array<{ path: Array<string | number | symbol>; message: string }>;
    }) => {
      if (event.collectionName === collectionName) {
        setValidationErrors(event.issues);
      }
    };
    app.sync.on("validation:error", handler);
    return () => {
      app.sync.off("validation:error", handler);
    };
  }, [app, collectionName]);

  const { data, loading, error } = useQuery<T>(collectionName);

  const insert = async (item: Partial<T>) => {
    return collection.insert(item as T);
  };

  const remove = async (filter: any) => {
    return collection.delete(filter);
  };

  return { data, loading, error, validationErrors, insert, remove };
}
