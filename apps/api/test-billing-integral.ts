import { addMonths, setDate, lastDayOfMonth, getDate, format } from 'date-fns';

enum PlanType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

class BillingLogicTester {
  calculateNextExpiration(currentAnchor: number, planType: PlanType, fromDate: Date): Date {
    let nextDate: Date;
    switch (planType) {
      case PlanType.MONTHLY: nextDate = addMonths(fromDate, 1); break;
      case PlanType.QUARTERLY: nextDate = addMonths(fromDate, 3); break;
      case PlanType.YEARLY: nextDate = addYears(fromDate, 1); break;
      default: nextDate = addMonths(fromDate, 1);
    }
    const lastDay = lastDayOfMonth(nextDate);
    const maxDayInMonth = getDate(lastDay);
    return currentAnchor > maxDayInMonth ? lastDay : setDate(nextDate, currentAnchor);
  }

  // Simulation of Maintenance Logic
  extendActive(anchor: number, currentExpiry: Date, plan: PlanType): Date {
    // Rule 5: Extends FROM original expiry
    return this.calculateNextExpiration(anchor, plan, currentExpiry);
  }

  // Simulation of Reset Logic
  reactivate(paymentDate: Date, plan: PlanType): { nextExpiry: Date, newAnchor: number } {
    // Rule 5: Resets anchor to today, extends FROM today
    const newAnchor = getDate(paymentDate);
    return {
      nextExpiry: this.calculateNextExpiration(newAnchor, plan, paymentDate),
      newAnchor
    };
  }
}

function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

const tester = new BillingLogicTester();

console.log('--- TEST 1: Anchor Day Snapback (31/03 -> 30/04 -> 31/05) ---');
const march31 = new Date(2024, 2, 31);
const anchor1 = 31;
const april30 = tester.calculateNextExpiration(anchor1, PlanType.MONTHLY, march31);
const may31 = tester.calculateNextExpiration(anchor1, PlanType.MONTHLY, april30);
console.log(`Start: ${format(march31, 'yyyy-MM-dd')}`);
console.log(`Step 1: ${format(april30, 'yyyy-MM-dd')} (Expected 30)`);
console.log(`Step 2: ${format(may31, 'yyyy-MM-dd')} (Expected 31)`);
if (getDate(april30) === 30 && getDate(may31) === 31) console.log('✅ Passed'); else { console.log('❌ Failed'); process.exit(1); }

console.log('\n--- TEST 2: Grace Period Maintenance (Anchor stays same) ---');
// Scenario: User expires on June 15. Pays on June 20 (during 7-day grace).
const anchor2 = 15;
const originalExpiry = new Date(2024, 5, 15);
const nextExpiry = tester.extendActive(anchor2, originalExpiry, PlanType.MONTHLY);
console.log(`Original Expiry: ${format(originalExpiry, 'yyyy-MM-dd')}`);
console.log(`Next Expiry:     ${format(nextExpiry, 'yyyy-MM-dd')} (Expected: July 15)`);
if (getDate(nextExpiry) === 15 && nextExpiry.getMonth() === 6) console.log('✅ Passed'); else { console.log('❌ Failed'); process.exit(1); }

console.log('\n--- TEST 3: Reactivation Reset (New Anchor) ---');
// Scenario: User was MOROSO. Pays on July 10 to reactivate.
const paymentDate = new Date(2024, 6, 10);
const { nextExpiry: reactExpiry, newAnchor } = tester.reactivate(paymentDate, PlanType.MONTHLY);
console.log(`Payment Date: ${format(paymentDate, 'yyyy-MM-dd')}`);
console.log(`New Anchor:   ${newAnchor} (Expected 10)`);
console.log(`Next Expiry:  ${format(reactExpiry, 'yyyy-MM-dd')} (Expected August 10)`);
if (newAnchor === 10 && getDate(reactExpiry) === 10 && reactExpiry.getMonth() === 7) console.log('✅ Passed'); else { console.log('❌ Failed'); process.exit(1); }

console.log('\n--- ALL ARCHITECTURAL KEY SCENARIOS PASSED ---');
