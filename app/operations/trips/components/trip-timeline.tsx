import React from 'react';

import { Button } from '@/components/ui/button';
import type { TripStep } from '../types';

interface TripTimelineProps {
  steps: TripStep[];
  currentStep: number;
  loading: boolean;
  onJumpToStep: (stepId: number) => Promise<void>;
}

const getStepStateClass = (stepId: number, currentStep: number): string => {
  if (stepId < currentStep) return 'done';
  if (stepId === currentStep) return 'current';
  return 'pending';
};

export default function TripTimeline({
  steps,
  currentStep,
  loading,
  onJumpToStep,
}: TripTimelineProps) {
  return (
    <div className="timeline-horizontal">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const stepStateClass = getStepStateClass(step.id, currentStep);
        const isDone = step.id < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div className={`timeline-step ${stepStateClass}`}>
              <Button
                type="button"
                variant="ghost"
                className="timeline-step-button"
                disabled={loading}
                onClick={() => onJumpToStep(step.id)}
                title={`ไปขั้นตอน: ${step.title}`}
              >
                <span className="timeline-step-index">{index + 1}</span>
                <Icon className="w-5 h-5" />
                <span className="timeline-step-title">{step.title}</span>
              </Button>
            </div>
            {!isLast && (
              <div className={`timeline-connector ${isDone ? 'done' : 'pending'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
