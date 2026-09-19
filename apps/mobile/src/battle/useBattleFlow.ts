import { useState } from 'react';
export function useBattleFlow() {
  const [reviewing, setReviewing] = useState(false);
  return { reviewing, review: () => setReviewing(true), edit: () => setReviewing(false) };
}
