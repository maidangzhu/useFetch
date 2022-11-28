import type { CancelTokenSource } from "axios";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates as batch } from "react-dom";

import axios from "axios";

const { CancelToken } = axios;
const { isCancel } = axios;

/**
 * @param fetcher
 */
const useFetch = <Payload = object, Data = object>(
  fetcher: (
    payload: Payload,
    prevData: Data | undefined,
    source: CancelTokenSource,
  ) => Promise<Data>,
) => {
  const [data, setData] = useState<Data>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error>();
  const [cacheFetcher] = useState(() => fetcher);
  const [fetchData, setFetchData] = useState<{ id: number; payload?: Payload }>(
    {
      id: 0,
      payload: undefined,
    },
  );
  const cacheRef = useRef<{
    isLoading: boolean;
    prevData?: Data;
    prevPayload?: Payload;
  }>({
    isLoading: false,
    prevData: data,
    prevPayload: fetchData?.payload ?? undefined,
  });

  useMemo(() => {
    cacheRef.current.isLoading = isLoading;
    cacheRef.current.prevData = data;
  }, [isLoading, data]);

  useEffect(() => {
    if (fetchData.id && fetchData.payload) {
      const source = CancelToken.source();
      cacheFetcher(fetchData.payload, cacheRef.current.prevData, source)
        .then((data) => {
          batch(() => {
            setData(data);
            setIsLoading(false);
            // update prevPayload after fetch success
            cacheRef.current.prevPayload = fetchData.payload;
          });
        })
        .catch((error) => {
          batch(() => {
            if (!isCancel(error)) {
              console.error(error);
              setIsLoading(false);
              setHasError(true);
              setError(error);
            }
          });
        });
      return () => {
        source.cancel();
      };
    }

    return () => {};
  }, [cacheFetcher, fetchData]);

  const dispatch = useCallback(
    (
      payloader:
        | Payload
        | ((options: {
        prevPayload?: Payload;
        isLoading: boolean;
        prevData?: Data;
      }) => Payload | false),
      resetData?: (data: Data | undefined) => Data | undefined,
    ) => {
      let payload: Payload;
      let cancel = false;
      if (payloader instanceof Function) {
        const state = payloader({
          prevPayload: cacheRef.current.prevPayload,
          isLoading: cacheRef.current.isLoading,
          prevData: cacheRef.current.prevData,
        });
        if (state === false) {
          cancel = true;
        } else {
          payload = state;
        }
      } else {
        payload = payloader;
      }

      batch(() => {
        if (!cancel) {
          setHasError(false);
          setError(undefined);
          setFetchData((prev) => {
            return { id: prev.id + 1, payload };
          });
          setIsLoading(true);
          if (typeof resetData === "function") {
            setData(resetData(cacheRef.current.prevData));
          } else {
            setData(undefined);
          }
        } else {
          if (typeof resetData === "function") {
            setData(resetData(cacheRef.current.prevData));
          }
        }
      });
    },
    [],
  );

  return [
    {
      data,
      error,
      isLoading,
      hasError,
      fetchData,
    },
    dispatch,
  ] as const;
};

export { useFetch };
