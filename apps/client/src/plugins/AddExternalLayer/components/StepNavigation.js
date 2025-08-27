import React from "react";
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";

/**
 * Step Navigation Component
 * Handles step navigation UI and controls
 */
export function StepNavigation({ 
  stepManager, 
  state, 
  setState, 
  onNext, 
  onPrevious, 
  onFinish,
  enqueueSnackbar
}) {
  const currentStep = stepManager.getCurrentStep();
  const canGoNext = stepManager.canGoNext(state);
  const canGoPrevious = stepManager.canGoPrevious();
  const isLastStep = stepManager.isLastStep();

  console.log("StepNavigation render:", {
    currentStepNumber: stepManager.getCurrentStepNumber(),
    currentStepTitle: currentStep?.title,
    canGoNext: canGoNext,
    isLastStep: isLastStep
  });

  const handleNext = () => {
    if (!canGoNext.canProceed) {
      enqueueSnackbar(canGoNext.message || "Cannot proceed to next step", {
        variant: "warning",
      });
      return;
    }

    // If in edit mode, always finish (don't go to next step)
    if (state.editMode) {
      if (onFinish) {
        onFinish();
      }
      return;
    }

    if (isLastStep) {
      // This is the final step, execute finish action
      if (onFinish) {
        onFinish();
      }
    } else {
      // Go to next step
      const success = stepManager.goNext(state, setState);
      if (success && onNext) {
        onNext();
      }
    }
  };

  const handlePrevious = () => {
    if (!canGoPrevious.canProceed) {
      enqueueSnackbar(canGoPrevious.message || "Cannot go to previous step", {
        variant: "warning",
      });
      return;
    }

    const success = stepManager.goPrevious(state, setState);
    if (success && onPrevious) {
      onPrevious();
    }
  };

  const nextButtonConfig = currentStep?.getNextButtonConfig(state) || {
    text: 'Next',
    disabled: true,
    icon: null
  };

  const previousButtonConfig = currentStep?.getPreviousButtonConfig(state) || {
    text: 'Back',
    disabled: true,
    icon: null
  };

  return (
    <>
      {/* Stepper */}
      <Stepper activeStep={stepManager.getCurrentStepNumber() - 1} sx={{ mb: 3 }}>
        {stepManager.getAllSteps().map((step) => (
          <Step key={step.stepNumber}>
            <StepLabel>{step.title}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Navigation Buttons */}
      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
        {!stepManager.isFirstStep() && (
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={!canGoPrevious.canProceed || previousButtonConfig.disabled}
            startIcon={previousButtonConfig.icon}
            sx={{ flex: 1 }}
          >
            {previousButtonConfig.text}
          </Button>
        )}
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleNext}
          disabled={!canGoNext.canProceed || nextButtonConfig.disabled}
          startIcon={nextButtonConfig.icon}
          sx={{ flex: stepManager.isFirstStep() ? 1 : 2 }}
        >
          {isLastStep ? (nextButtonConfig.text || 'Finish') : nextButtonConfig.text}
        </Button>
      </Box>
    </>
  );
}