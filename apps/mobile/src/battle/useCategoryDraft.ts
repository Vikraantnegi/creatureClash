import { useState } from 'react';
import type { CATEGORY } from '@creature-clash/battle-engine';
export function useCategoryDraft() {
  const [draft, select] = useState<CATEGORY | null>(null);
  return { draft, select };
}
