/**
 * Test with user's ACTUAL parameters
 * Run with: npx tsx test-user-params.ts
 */

import { getDefaultValues } from './src/models/parameters';
import { runModel } from './src/models/computeModel';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// Get default params
const params = getDefaultValues();

// Apply Compute Constrained scenario
params.tier_routine_flops = 17;
params.tier_standard_flops = 19;
params.tier_complex_flops = 21;
params.tier_expert_flops = 23;  // Expert = 10^23 FLOPs/hr
params.tier_frontier_flops = 22; // Frontier = 10^22 FLOPs/hr (user lowered from 25)
params.computeGrowthRate = 0.5;
params.computeGrowthDecay = 0.08;

// User's displayed year
params.year = 2030;

console.log('=== USER PARAMETERS ===');
console.log('Expert FLOPs:', params.tier_expert_flops, '(10^' + params.tier_expert_flops + ')');
console.log('Frontier FLOPs:', params.tier_frontier_flops, '(10^' + params.tier_frontier_flops + ')');
console.log('NOTE: Expert requires 10x MORE compute than Frontier!\n');

const outputs = runModel(params);
const projection = outputs.projections.find(p => p.year === 2030);

if (!projection) {
  throw new Error('No projection for 2030');
}

console.log('\n=== RESULTS FOR 2030 ===');
console.log('\nScarcity Premium:', projection.scarcityPremium?.toFixed(2) + 'x');
console.log('Clearing Tier:', projection.clearingTier);
console.log('Market Price:', (projection.marketPricePerFLOP * 1e18).toExponential(3), '$/ExaFLOP');
console.log('Production Cost:', (projection.productionCostPerFLOP * 1e18).toExponential(3), '$/ExaFLOP');

for (const ta of projection.tierAllocations) {
  console.log(`\n${ta.tier.name} (10^${ta.tier.flopsPerHourExponent} FLOPs/hr):`);
  console.log(`  Production cost: $${ta.productionCostPerHour.toFixed(2)}/hr`);
  console.log(`  Market cost: $${ta.aiCostPerHour.toFixed(2)}/hr`);
  console.log(`  Human wage: $${ta.tierWage.toFixed(2)}/hr`);
  console.log(`  Task value: $${ta.tier.taskValue}/hr`);
  const aiCheaper = ta.aiCostPerHour < ta.tierWage;
  console.log(`  AI < Human wage? ${aiCheaper ? 'YES ✓' : 'NO ✗'}`);
  const aiProfitable = ta.aiCostPerHour < ta.tier.taskValue;
  console.log(`  AI < Task value? ${aiProfitable ? 'YES ✓' : 'NO ✗'}`);
  console.log(`  AI Share: ${(ta.aiShare * 100).toFixed(1)}%`);
  console.log(`  Human Share: ${(ta.humanShare * 100).toFixed(1)}%`);
  console.log(`  Binding Constraint: ${ta.bindingConstraint}`);
}

// Print auction debug ordering (sorted by reservation bid per FLOP)
console.log('\n=== AUCTION DEBUG (sorted by reservation bid) ===');
const marketPricePerFLOP = projection.marketPricePerFLOP;
const auctionDebug = projection.tierAllocations.map(ta => {
  // aiCostPerHour = marketPricePerFLOP * effectiveFlopsPerHour
  const effectiveFlopsPerHour = marketPricePerFLOP > 0 ? ta.aiCostPerHour / marketPricePerFLOP : 0;
  const tierHours = projection.totalCognitiveWorkHours * ta.tier.shareOfCognitive;
  const maxAIHours = tierHours * ta.effectiveSubstitutability;
  const maxComputeNeeded = maxAIHours * effectiveFlopsPerHour;
  return {
    id: ta.tier.id,
    name: ta.tier.name,
    reservationPricePerFLOP: ta.reservationPrice,
    effectiveFlopsPerHour,
    maxAIHours,
    maxComputeNeeded,
    aiShare: ta.aiShare,
  };
}).sort((a, b) => b.reservationPricePerFLOP - a.reservationPricePerFLOP);

auctionDebug.forEach(d => {
  const bidStr = d.reservationPricePerFLOP > 0 ? d.reservationPricePerFLOP.toExponential(3) : String(d.reservationPricePerFLOP);
  console.log(
    `  ${d.id.padEnd(9)} bid=${bidStr} $/FLOP  maxAIHours=${(d.maxAIHours/1e9).toFixed(2)}B hrs/yr  AIshare=${(d.aiShare*100).toFixed(1)}%`
  );
});

// Check Frontier specifically
const frontier = projection.tierAllocations.find(ta => ta.tier.id === 'frontier');
if (frontier) {
  console.log('\n=== FRONTIER ANALYSIS ===');
  console.log('AI cost:', '$' + frontier.aiCostPerHour.toFixed(2));
  console.log('Human wage:', '$' + frontier.tierWage.toFixed(2));
  console.log('Task value:', '$' + frontier.tier.taskValue);
  console.log('Binding constraint:', frontier.bindingConstraint);
  
  const aiIsCheaper = frontier.aiCostPerHour < frontier.tierWage;
  const aiIsProfitable = frontier.aiCostPerHour < frontier.tier.taskValue;
  const noAI = frontier.aiShare < 0.01;
  
  if (aiIsCheaper && aiIsProfitable && noAI) {
    if (frontier.bindingConstraint === 'compute') {
      console.log('\n✓ CORRECT: AI is cheaper but not allocated due to compute scarcity.');
      console.log('  The auction allocates compute to higher willingness-to-pay-per-FLOP tiers first.');
      console.log('  Market price reflects this scarcity (premium: ' + projection.scarcityPremium?.toFixed(2) + 'x)');
    } else {
      console.log('\n⚠️ WARNING: AI is cheaper but binding constraint is not "compute"');
      console.log('  Expected "compute" but got "' + frontier.bindingConstraint + '"');
    }
  } else if (!aiIsCheaper && noAI) {
    console.log('\n✓ CORRECT: AI is more expensive than human wage, not being used.');
  } else if (frontier.aiShare > 0) {
    console.log('\n✓ CORRECT: AI is being allocated to Frontier.');
    console.log(`  AI share: ${(frontier.aiShare * 100).toFixed(1)}%`);
  }
  
  // Regression assertion:
  // If Frontier AI is cheaper than BOTH equilibrium human wages and task value, it should not be priced out.
  if (aiIsCheaper && aiIsProfitable) {
    assert(
      frontier.aiShare > 0.01,
      `Frontier is economical (AI<$wage and AI<$value) but got ~0% AI share (${(frontier.aiShare * 100).toFixed(2)}%).`
    );
  }
} else {
  throw new Error('Frontier tier not found in projection output');
}

console.log('\n=== TEST PASSED ===');
