import type { AtsVendor } from '@jobmatch/types';

export { detectAts, isFixtureApplyUrl, atsVendorLabel } from './ats-detect';
export { buildSelectorPlan, type FieldSelectorPlan } from './field-map';
export { runAtsFill, type RunAtsFillInput } from './run-fill';

export function canRunAssistFill(input: {
  vendor: AtsVendor;
  fillApproved: boolean;
}): boolean {
  if (!input.fillApproved) return false;
  if (input.vendor === 'fixture') return true;
  if (input.vendor === 'unknown') return false;
  return process.env.APPLY_AUTOMATION_LIVE === '1';}
