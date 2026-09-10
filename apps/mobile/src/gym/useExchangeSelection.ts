import { useState } from 'react';
export function useExchangeSelection() {
  const [give, setGive] = useState<string | null>(null);
  const [receive, setReceive] = useState<string | null>(null);
  return { give, receive, setGive, setReceive, swap: give && receive ? { give, receive } : null };
}
