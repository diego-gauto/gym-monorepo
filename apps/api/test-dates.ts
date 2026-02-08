import { addMonths, setDate, lastDayOfMonth, getDate, format } from 'date-fns';

function calculateNextExpiration(currentAnchor: number, fromDate: Date): Date {
  const nextDateBase = addMonths(fromDate, 1);
  const lastDay = lastDayOfMonth(nextDateBase);
  const maxDayInMonth = getDate(lastDay);

  if (currentAnchor > maxDayInMonth) {
    return lastDay;
  } else {
    return setDate(nextDateBase, currentAnchor);
  }
}

// Case: MARCH 31
const march31 = new Date(2024, 2, 31); // 2024 is leap, but March is 31 anyway. Date month is 0-indexed.
const anchor = 31;

console.log(`Starting with: ${format(march31, 'yyyy-MM-dd')} (Anchor: ${anchor})`);

const nextApril = calculateNextExpiration(anchor, march31);
console.log(`Next (April): ${format(nextApril, 'yyyy-MM-dd')} (Expected: 30)`);

const nextMay = calculateNextExpiration(anchor, nextApril);
console.log(`Next (May):   ${format(nextMay, 'yyyy-MM-dd')} (Expected: 31)`);

// Verification
const okApril = getDate(nextApril) === 30;
const okMay = getDate(nextMay) === 31;

if (okApril && okMay) {
  console.log('✅ TEST PASSED: Anchor Day logic works correctly!');
} else {
  console.log('❌ TEST FAILED: Anchor Day logic is incorrect.');
  process.exit(1);
}
