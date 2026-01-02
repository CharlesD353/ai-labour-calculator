import { useState } from 'react';
import type { ParameterValues } from '../models/parameters';

interface OnboardingWizardProps {
  onComplete: (params: Partial<ParameterValues>) => void;
  onSkip: () => void;
}

// Question definitions
const QUESTIONS = [
  {
    id: 'computeGrowth',
    title: 'Compute Growth',
    question: 'How fast will global AI compute capacity grow?',
    explanation: 'Historical rate is ~100%/year (doubling). This affects how much AI inference capacity is available. Note that the % number is initial growth rate - in all cases we assume this growth rate will decline over time. You can tweak this with more granularity in the compute parameters.',
    options: [
      { id: 'A', label: 'Slow (30%/yr)', description: 'Supply chains and energy constrain growth — 1.3× annually', value: 0.3 },
      { id: 'B', label: 'Moderate (60%/yr)', description: 'Steady expansion — 1.6× annually', value: 0.6 },
      { id: 'C', label: 'Fast (100%/yr)', description: 'Current trend continues — 2× annually (default)', value: 1.0 },
      { id: 'D', label: 'Explosive (150%/yr)', description: 'AI boom drives massive buildout — 2.5× annually', value: 1.5 },
    ],
  },
  {
    id: 'demandElasticity',
    title: 'Demand Elasticity (Jevons Effect)',
    question: 'When AI makes tasks cheaper, how much more work gets done?',
    explanation: 'If AI cuts costs 90%, does demand stay flat (0.1) or expand dramatically (0.8)?',
    options: [
      { id: 'A', label: 'Minimal (ε=0.1)', description: 'Fixed workloads — 90% cost drop → only 10% more work gets done', value: 0.1 },
      { id: 'B', label: 'Moderate (ε=0.3)', description: 'Some expansion — 90% cost drop → 30% more work gets done', value: 0.3 },
      { id: 'C', label: 'Strong (ε=0.5)', description: 'Significant expansion — 90% cost drop → 50% more work gets done', value: 0.5 },
      { id: 'D', label: 'Very strong (ε=0.8)', description: 'Major expansion — 90% cost drop → 80% more work gets done', value: 0.8 },
    ],
  },
  {
    id: 'newTaskCreation',
    title: 'New Task Creation',
    question: 'Will AI enable entirely new categories of work?',
    explanation: 'As AI becomes more capable (σ grows), new use cases emerge. This sets how strongly capability growth translates to new work.',
    options: [
      { id: 'A', label: 'Minimal', description: 'AI mostly automates existing work — few new job categories', value: 0.02 },
      { id: 'B', label: 'Some', description: 'New niches emerge — personalized tutoring, AI assistants', value: 0.10 },
      { id: 'C', label: 'Substantial', description: 'Major new industries — like the internet created e-commerce', value: 0.20 },
      { id: 'D', label: 'Transformative', description: 'Explosion of new work categories — more than AI automates', value: 0.35 },
    ],
  },
  {
    id: 'breakthroughTiming',
    title: 'Breakthrough Timing',
    question: 'When will AI become capable at different task types?',
    explanation: 'Sets when each tier reaches its capability "breakthrough" — the midpoint of the S-curve.',
    options: [
      { 
        id: 'A', 
        label: 'Soon', 
        description: 'Breakthroughs imminent across the board — Frontier by 2028',
        value: { routine: 2025, standard: 2026, complex: 2027, expert: 2028, frontier: 2028 }
      },
      { 
        id: 'B', 
        label: 'Near-term', 
        description: 'Next 5-10 years — Frontier by early 2030s',
        value: { routine: 2026, standard: 2027, complex: 2028, expert: 2030, frontier: 2032 }
      },
      { 
        id: 'C', 
        label: 'Gradual', 
        description: 'Spread over 10-20 years — Frontier by 2040',
        value: { routine: 2027, standard: 2029, complex: 2032, expert: 2035, frontier: 2040 }
      },
      { 
        id: 'D', 
        label: 'Distant', 
        description: 'Frontier tasks decades away — not until 2050',
        value: { routine: 2028, standard: 2032, complex: 2038, expert: 2043, frontier: 2050 }
      },
    ],
  },
  {
    id: 'transitionSpeed',
    title: 'Transition Speed',
    question: 'Once AI becomes capable, how fast will adoption follow?',
    explanation: 'Steepness of the S-curve. Low = slow organizational adoption, high = rapid deployment.',
    options: [
      { id: 'A', label: 'Very slow (k=0.4)', description: '~15 year transition — regulatory/trust barriers', value: 0.4 },
      { id: 'B', label: 'Moderate (k=0.8)', description: '~7 year transition — typical enterprise adoption', value: 0.8 },
      { id: 'C', label: 'Fast (k=1.5)', description: '~4 year transition — strong market pressure', value: 1.5 },
      { id: 'D', label: 'Very fast (k=2.5)', description: '~2 year transition — adoption follows capability closely', value: 2.5 },
    ],
  },
  {
    id: 'substitutabilityCeilings',
    title: 'Substitutability Ceilings',
    question: 'What\'s the ultimate limit on AI replacing human work?',
    explanation: 'Even with infinite time, what fraction of each tier can AI eventually do?',
    options: [
      { 
        id: 'A', 
        label: 'Limited', 
        description: 'Humans essential for most complex work — AI hits hard limits',
        value: { routine: 0.80, standard: 0.70, complex: 0.50, expert: 0.25, frontier: 0.15 }
      },
      { 
        id: 'B', 
        label: 'Moderate', 
        description: 'AI handles routine well, humans keep advantages in expertise',
        value: { routine: 0.95, standard: 0.80, complex: 0.70, expert: 0.50, frontier: 0.30 }
      },
      { 
        id: 'C', 
        label: 'High', 
        description: 'AI can do almost everything eventually — few truly human-only tasks',
        value: { routine: 0.99, standard: 0.98, complex: 0.95, expert: 0.90, frontier: 0.80 }
      },
      { 
        id: 'D', 
        label: 'No limits', 
        description: 'AI can fully substitute for any human cognitive task',
        value: { routine: 1.0, standard: 1.0, complex: 1.0, expert: 1.0, frontier: 1.0 }
      },
    ],
  },
];

/**
 * Map user's answer selections to actual parameter values
 */
function mapAnswersToParams(answers: Record<string, string>): Partial<ParameterValues> {
  const params: Partial<ParameterValues> = {};
  
  // Q1: Compute Growth
  const computeQ = QUESTIONS[0];
  const computeAnswer = computeQ.options.find(o => o.id === answers.computeGrowth);
  if (computeAnswer) {
    params.computeGrowthRate = computeAnswer.value as number;
  }
  
  // Q2: Demand Elasticity
  const demandQ = QUESTIONS[1];
  const demandAnswer = demandQ.options.find(o => o.id === answers.demandElasticity);
  if (demandAnswer) {
    params.demandElasticity = demandAnswer.value as number;
  }
  
  // Q3: New Task Creation
  const newTaskQ = QUESTIONS[2];
  const newTaskAnswer = newTaskQ.options.find(o => o.id === answers.newTaskCreation);
  if (newTaskAnswer) {
    params.newTaskCreationRate = newTaskAnswer.value as number;
  }
  
  // Q4: Breakthrough Timing (per-tier sigmaMidpoint)
  const timingQ = QUESTIONS[3];
  const timingAnswer = timingQ.options.find(o => o.id === answers.breakthroughTiming);
  if (timingAnswer && typeof timingAnswer.value === 'object') {
    const v = timingAnswer.value as { routine: number; standard: number; complex: number; expert: number; frontier: number };
    params.tier_routine_sigmaMidpoint = v.routine;
    params.tier_standard_sigmaMidpoint = v.standard;
    params.tier_complex_sigmaMidpoint = v.complex;
    params.tier_expert_sigmaMidpoint = v.expert;
    params.tier_frontier_sigmaMidpoint = v.frontier;
  }
  
  // Q5: Transition Speed (all tiers get same steepness)
  const speedQ = QUESTIONS[4];
  const speedAnswer = speedQ.options.find(o => o.id === answers.transitionSpeed);
  if (speedAnswer) {
    const steepness = speedAnswer.value as number;
    params.tier_routine_sigmaSteepness = steepness;
    params.tier_standard_sigmaSteepness = steepness;
    params.tier_complex_sigmaSteepness = steepness;
    params.tier_expert_sigmaSteepness = steepness;
    params.tier_frontier_sigmaSteepness = steepness;
  }
  
  // Q6: Substitutability Ceilings (per-tier maxSigma)
  const ceilingQ = QUESTIONS[5];
  const ceilingAnswer = ceilingQ.options.find(o => o.id === answers.substitutabilityCeilings);
  if (ceilingAnswer && typeof ceilingAnswer.value === 'object') {
    const v = ceilingAnswer.value as { routine: number; standard: number; complex: number; expert: number; frontier: number };
    params.tier_routine_maxSigma = v.routine;
    params.tier_standard_maxSigma = v.standard;
    params.tier_complex_maxSigma = v.complex;
    params.tier_expert_maxSigma = v.expert;
    params.tier_frontier_maxSigma = v.frontier;
  }
  
  return params;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const currentQuestion = QUESTIONS[step];
  const isLastStep = step === QUESTIONS.length - 1;
  const isSummaryStep = step === QUESTIONS.length;
  
  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
  };
  
  const handleNext = () => {
    if (isLastStep) {
      setStep(step + 1); // Go to summary
    } else {
      setStep(step + 1);
    }
  };
  
  const handleBack = () => {
    setStep(step - 1);
  };
  
  const handleApply = () => {
    const params = mapAnswersToParams(answers);
    onComplete(params);
  };
  
  const canProceed = currentQuestion ? answers[currentQuestion.id] !== undefined : true;
  
  // Summary step
  if (isSummaryStep) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#12121a] border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Your Assumptions</h2>
            <p className="text-sm text-zinc-400 mb-6">Review your selections before applying them to the model.</p>
            
            <div className="space-y-3 mb-6">
              {QUESTIONS.map((q) => {
                const selectedOption = q.options.find(o => o.id === answers[q.id]);
                return (
                  <div key={q.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div>
                      <p className="text-sm text-zinc-300">{q.title}</p>
                      <p className="text-xs text-zinc-500">{q.question}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-amber-400">
                        {selectedOption?.label ?? 'Not set'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Use Defaults Instead
                </button>
                <button
                  onClick={handleApply}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Apply My Assumptions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Question steps
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-zinc-800 rounded-xl max-w-2xl w-full">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-100">Set Your Assumptions</h2>
            <span className="text-sm text-zinc-500">Step {step + 1} of {QUESTIONS.length}</span>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-amber-500' : i === step ? 'bg-amber-400' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Question */}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">{currentQuestion.question}</h3>
          <p className="text-sm text-zinc-400 mb-6">{currentQuestion.explanation}</p>
          
          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'border-amber-500 bg-amber-500' : 'border-zinc-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>
                        {option.label}
                      </p>
                      <p className="text-sm text-zinc-500 mt-0.5">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-between">
          <div>
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip — Use Defaults
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                canProceed
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isLastStep ? 'Review' : 'Next'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

