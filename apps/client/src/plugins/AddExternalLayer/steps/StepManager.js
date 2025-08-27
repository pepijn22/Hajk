/**
 * Step Manager for AddExternalLayer plugin
 * Manages step navigation, validation, and lifecycle
 */
export class StepManager {
  constructor(steps = []) {
    this.steps = steps;
    this.currentStepIndex = 0;
  }

  /**
   * Add a step to the manager
   * @param {BaseStep} step - Step instance to add
   */
  addStep(step) {
    this.steps.push(step);
    // Sort steps by step number to maintain order
    this.steps.sort((a, b) => a.stepNumber - b.stepNumber);
  }

  /**
   * Get the current step
   * @returns {BaseStep} Current step instance
   */
  getCurrentStep() {
    return this.steps[this.currentStepIndex];
  }

  /**
   * Get all steps
   * @returns {Array<BaseStep>} Array of all steps
   */
  getAllSteps() {
    return this.steps;
  }

  /**
   * Get the current step number (1-based)
   * @returns {number} Current step number
   */
  getCurrentStepNumber() {
    return this.currentStepIndex + 1;
  }

  /**
   * Get the total number of steps
   * @returns {number} Total step count
   */
  getTotalSteps() {
    return this.steps.length;
  }

  /**
   * Check if we can go to the next step
   * @param {Object} state - Current plugin state
   * @returns {Object} { canProceed: boolean, message?: string }
   */
  canGoNext(state) {
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return { canProceed: false, message: "No current step" };
    }

    // For the last step, we should allow "finishing" (which is handled as "next")
    if (this.currentStepIndex >= this.steps.length - 1) {
      console.log("At last step, checking validation for finish action");
      const validation = currentStep.validate(state);
      return { 
        canProceed: validation.isValid, 
        message: validation.message || "Can finish"
      };
    }

    const validation = currentStep.validate(state);
    return { 
      canProceed: validation.isValid, 
      message: validation.message 
    };
  }

  /**
   * Check if we can go to the previous step
   * @returns {Object} { canProceed: boolean, message?: string }
   */
  canGoPrevious() {
    if (this.currentStepIndex <= 0) {
      return { canProceed: false, message: "Already at first step" };
    }
    return { canProceed: true };
  }

  /**
   * Go to the next step
   * @param {Object} state - Current plugin state
   * @param {Function} setState - State setter function
   * @returns {boolean} Success status
   */
  goNext(state, setState) {
    const canProceed = this.canGoNext(state);
    if (!canProceed.canProceed) {
      return false;
    }

    const currentStep = this.getCurrentStep();
    const nextStep = this.steps[this.currentStepIndex + 1];

    // Execute current step's onExit
    if (currentStep && currentStep.onExit) {
      currentStep.onExit(state, setState);
    }

    // Move to next step
    this.currentStepIndex++;

    // Execute next step's onEnter
    if (nextStep && nextStep.onEnter) {
      nextStep.onEnter(state, setState);
    }

    return true;
  }

  /**
   * Go to the previous step
   * @param {Object} state - Current plugin state
   * @param {Function} setState - State setter function
   * @returns {boolean} Success status
   */
  goPrevious(state, setState) {
    const canProceed = this.canGoPrevious();
    if (!canProceed.canProceed) {
      console.log("Cannot go to previous step:", canProceed.message);
      return false;
    }

    const currentStep = this.getCurrentStep();
    const previousStep = this.steps[this.currentStepIndex - 1];

    console.log("Going from step", this.currentStepIndex + 1, "to step", this.currentStepIndex);
    console.log("Current step:", currentStep?.title);
    console.log("Previous step:", previousStep?.title);

    // Execute current step's onExit
    if (currentStep && currentStep.onExit) {
      console.log("Executing onExit for:", currentStep.title);
      currentStep.onExit(state, setState);
    }

    // Move to previous step
    this.currentStepIndex--;
    console.log("Step index changed to:", this.currentStepIndex);

    // Execute previous step's onEnter
    if (previousStep && previousStep.onEnter) {
      console.log("Executing onEnter for:", previousStep.title);
      previousStep.onEnter(state, setState);
    }

    console.log("Successfully moved to step:", this.getCurrentStepNumber());
    return true;
  }

  /**
   * Go to a specific step by number (1-based)
   * @param {number} stepNumber - Target step number (1-based)
   * @param {Object} state - Current plugin state
   * @param {Function} setState - State setter function
   * @returns {boolean} Success status
   */
  goToStep(stepNumber, state, setState) {
    const targetIndex = stepNumber - 1;
    if (targetIndex < 0 || targetIndex >= this.steps.length) {
      return false;
    }

    const currentStep = this.getCurrentStep();
    const targetStep = this.steps[targetIndex];

    // Execute current step's onExit
    if (currentStep && currentStep.onExit) {
      currentStep.onExit(state, setState);
    }

    // Move to target step
    this.currentStepIndex = targetIndex;

    // Execute target step's onEnter
    if (targetStep && targetStep.onEnter) {
      targetStep.onEnter(state, setState);
    }

    return true;
  }

  /**
   * Reset to the first step
   * @param {Object} state - Current plugin state
   * @param {Function} setState - State setter function
   */
  reset(state, setState) {
    this.goToStep(1, state, setState);
  }

  /**
   * Check if this is the first step
   * @returns {boolean} True if on first step
   */
  isFirstStep() {
    return this.currentStepIndex === 0;
  }

  /**
   * Check if this is the last step
   * @returns {boolean} True if on last step
   */
  isLastStep() {
    return this.currentStepIndex === this.steps.length - 1;
  }

  /**
   * Get step configuration for stepper component
   * @returns {Array} Array of step configurations
   */
  getStepperConfig() {
    return this.steps.map(step => ({
      label: step.title,
      description: step.description,
      completed: false // Can be enhanced to track completion
    }));
  }
}