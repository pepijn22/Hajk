/**
 * Base class for AddExternalLayer plugin steps
 * Provides common functionality and interface for all steps
 */
export class BaseStep {
  constructor(stepNumber, title, description) {
    this.stepNumber = stepNumber;
    this.title = title;
    this.description = description;
  }

  /**
   * Validate if the step can proceed to the next step
   * @param {Object} state - Current plugin state
   * @returns {Object} { isValid: boolean, message?: string }
   */
  validate(state) {
    return { isValid: true };
  }

  /**
   * Execute any logic when entering this step
   * @param {Object} state - Current plugin state
   * @param {Function} setState - State setter function
   */
  onEnter(state, setState) {
    // Override in subclasses
  }

  /**
   * Execute any logic when leaving this step
   * @param {Object} state - Current plugin state
   * @param {Function} setState - State setter function
   */
  onExit(state, setState) {
    // Override in subclasses
  }

  /**
   * Render the step content
   * @param {Object} state - Current plugin state
   * @param {Object} handlers - Event handlers
   * @returns {React.Component} Step content
   */
  render(state, handlers) {
    throw new Error('render() method must be implemented by subclasses');
  }

  /**
   * Get the next button configuration
   * @param {Object} state - Current plugin state
   * @returns {Object} { text: string, disabled: boolean, icon?: React.Component }
   */
  getNextButtonConfig(state) {
    return {
      text: 'Next',
      disabled: !this.validate(state).isValid,
      icon: null
    };
  }

  /**
   * Get the previous button configuration
   * @param {Object} state - Current plugin state
   * @returns {Object} { text: string, disabled: boolean, icon?: React.Component }
   */
  getPreviousButtonConfig(state) {
    return {
      text: 'Back',
      disabled: false,
      icon: null
    };
  }
}