import { useEffect, useState } from 'react';

type Options = {
  disableOnMobile?: boolean;
};

const subscribeMediaQuery = (mq: MediaQueryList, onChange: () => void) => {
  if (typeof (mq as any).addEventListener === 'function') {
    (mq as any).addEventListener('change', onChange);
    return () => (mq as any).removeEventListener('change', onChange);
  }
  // Safari <= 13
  if (typeof (mq as any).addListener === 'function') {
    (mq as any).addListener(onChange);
    return () => (mq as any).removeListener(onChange);
  }
  return () => {};
};

export const useDisableMarqueeMotion = (options?: Options) => {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileMq = window.matchMedia('(max-width: 768px)');
    const disableOnMobile = options?.disableOnMobile ?? true;

    const update = () => setDisabled(Boolean(reduceMq.matches || (disableOnMobile && mobileMq.matches)));
    update();

    const unsubReduce = subscribeMediaQuery(reduceMq, update);
    const unsubMobile = subscribeMediaQuery(mobileMq, update);

    return () => {
      unsubReduce();
      unsubMobile();
    };
  }, [options?.disableOnMobile]);

  return disabled;
};
