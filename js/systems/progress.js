// Progress calculations derived from the central state — the only place
// totals are computed, so every screen shows consistent numbers.

import { state, STAGES } from '../state.js';

export function stageStats(stageId) {
  const def = STAGES.find((s) => s.id === stageId);
  const explored = (state.explored[stageId] || []).length;
  const total = def ? def.items.length : 0;
  return {
    id: stageId,
    label: def ? def.label : stageId,
    icon: def ? def.icon : '❓',
    explored,
    total,
    complete: total > 0 && explored >= total,
  };
}

export function totalStats() {
  let explored = 0;
  let total = 0;
  const stages = STAGES.map((s) => {
    const stats = stageStats(s.id);
    explored += stats.explored;
    total += stats.total;
    return stats;
  });
  return { explored, total, stages };
}
