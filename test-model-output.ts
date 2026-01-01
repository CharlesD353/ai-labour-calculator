/**
 * Test actual model output
 * Run with: npx tsx test-model-output.ts
 */

import { getDefaultValues } from './src/models/parameters';
import { runModel } from './src/models/computeModel';

// Get params for compute constrained scenario
const params = getDefaultValues();
params.baseComputeExponent = 21;
params.computeGrowthRate = 0.3;
params.tier_frontier_flops = 22;
params.year = 2030;

console.log('Running model with params:');
console.log('  baseComputeExponent:', params.baseComputeExponent);
console.log('  computeGrowthRate:', params.computeGrowthRate);
console.log('  tier_frontier_flops:', params.tier_frontier_flops);
console.log('  year:', params.year);
console.log('');

const outputs = runModel(params);
const projection = outputs.projections.find(p => p.year === 2030);

if (!projection) {
  console.error('No projection for 2030');
  process.exit(1);
}

console.log('=== 2030 PROJECTION ===');
console.log('');
console.log('Market Price per FLOP:', projection.marketPricePerFLOP.toExponential(2));
console.log('Production Cost per FLOP:', projection.productionCostPerFLOP.toExponential(2));
console.log('Scarcity Premium:', projection.scarcityPremium.toFixed(2) + 'x');
console.log('Clearing Tier:', projection.clearingTier);
console.log('Compute Utilization:', (projection.computeUtilization * 100).toFixed(1) + '%');
console.log('');

console.log('=== TIER ALLOCATIONS ===');
console.log('');
console.log('Tier       | FLOPs Exp | Prod $/hr | Market $/hr | Human Wage | AI Share | Human % | Constraint');
console.log('-----------|-----------|-----------|-------------|------------|----------|---------|------------');

for (const ta of projection.tierAllocations) {
  const flopsExp = ta.tier.flopsPerHourExponent;
  const prodCost = ta.productionCostPerHour;
  const marketCost = ta.aiCostPerHour;
  const humanWage = ta.tierWage;
  const aiShare = ta.aiShare * 100;
  const humanShare = ta.humanShare * 100;
  const constraint = ta.bindingConstraint;
  
  console.log(
    `${ta.tier.name.padEnd(10)} | 10^${flopsExp.toString().padStart(2)}    | $${prodCost.toFixed(2).padStart(8)} | $${marketCost.toFixed(2).padStart(10)} | $${humanWage.toFixed(2).padStart(9)} | ${aiShare.toFixed(0).padStart(6)}% | ${humanShare.toFixed(0).padStart(5)}% | ${constraint}`
  );
}

console.log('');
console.log('=== VERIFICATION ===');
console.log('');

// Check Frontier specifically
const frontier = projection.tierAllocations.find(ta => ta.tier.name === 'Frontier');
if (frontier) {
  console.log('FRONTIER TIER:');
  console.log('  FLOPs exponent:', frontier.tier.flopsPerHourExponent);
  console.log('  Production cost/hr:', '$' + frontier.productionCostPerHour.toFixed(2));
  console.log('  Market cost/hr:', '$' + frontier.aiCostPerHour.toFixed(2));
  console.log('  Human wage:', '$' + frontier.tierWage.toFixed(2));
  console.log('  Task value:', '$' + frontier.tier.taskValue);
  console.log('  AI cheaper than human?', frontier.aiCostPerHour < frontier.tierWage ? 'YES' : 'NO');
  console.log('  AI profitable (< task value)?', frontier.aiCostPerHour < frontier.tier.taskValue ? 'YES' : 'NO');
  console.log('');
  console.log('  Hours AI:', frontier.hoursAI.toExponential(2));
  console.log('  Hours Human:', frontier.hoursHuman.toExponential(2));
  console.log('  AI Share:', (frontier.aiShare * 100).toFixed(1) + '%');
  console.log('  Binding Constraint:', frontier.bindingConstraint);
  console.log('');
  
  if (frontier.aiCostPerHour < frontier.tierWage && frontier.aiShare < 0.01) {
    console.log('⚠️  BUG DETECTED: AI is cheaper than human but not being used!');
  }
}

