import { useEffect, useRef } from 'react';

/**
 * Runs fetch when page changes; resets page to 0 when filterSig changes before fetching.
 */
export function useFilterPageFetch(
  filterSig: string,
  page: number,
  setPage: (value: number | ((prev: number) => number)) => void,
  fetchData: () => void
): void {
  const prevFilterSig = useRef(filterSig);

  useEffect(() => {
    if (prevFilterSig.current !== filterSig) {
      prevFilterSig.current = filterSig;
      if (page !== 0) {
        setPage(0);
        return;
      }
    }
    fetchData();
  }, [filterSig, page, fetchData, setPage]);
}
