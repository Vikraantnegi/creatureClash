let sequence = 0;
export const nextEncounterId = () => `encounter-${Date.now()}-${++sequence}`;
