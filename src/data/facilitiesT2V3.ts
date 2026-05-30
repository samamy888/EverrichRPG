import { Facility, T2_FACILITIES } from './facilities';

const isDGate = (f: Facility) => f.type === 'gate' && /^gate-d/i.test(f.id);
const isCGate = (f: Facility) => f.type === 'gate' && /^gate-c/i.test(f.id);

export const T2_FACILITIES_V3_CENTRAL: Facility[] = T2_FACILITIES.filter((f) => {
  if (f.type === 'gate') return false;
  return f.y >= 520 && f.y <= 3000;
});

export const T2_FACILITIES_V3_NORTH_D: Facility[] = T2_FACILITIES.filter((f) => {
  if (isDGate(f)) return true;
  if (f.id === 'flight-info-center' || f.id === 'security-lane' || f.id === 'customs-main') return true;
  return false;
});

export const T2_FACILITIES_V3_SOUTH_C: Facility[] = T2_FACILITIES.filter((f) => {
  if (isCGate(f)) return true;
  if (f.id === 'atm-service-1' || f.id === 'food-court') return true;
  return false;
});
