# useFetch
A good react hook for you to fetch data and handling loading status and more.

### example
```ts
const [
  {
    data,
    isLoading,
    hasError,
  },
  dispatch,
] = useFetch<Partial<SearchParam & { extendFilter: boolean }>, SearchResult>(
  async (payload, prevData, source) => {
    const { extendFilter, ...fetchPayload } = payload;
    const result = await Http().post<SearchResult>(theExampleApi, fetchPayload, {
      cancelToken: source.token, // axios cancel token
    });
    
    Object.assign(result, {
      list: [...(prevData?.list ?? []), ...result.list],
      hasMore: result.total ? result.total > payload.offset! + payload.limit! : false,
      filter: extendFilter ? prevData!.filter : result.filter,
      tokens: extendFilter ? prevData!.tokens : result.tokens,
    });
    
    return result;
  }
);
```
