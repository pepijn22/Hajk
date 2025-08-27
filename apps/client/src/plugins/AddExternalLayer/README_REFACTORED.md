# AddExternalLayer Plugin - Refactored Architecture

## Overview

The AddExternalLayer plugin has been refactored into a modular, step-based architecture that makes it easy to maintain, extend, and test. The code is now split across multiple files with clear separation of concerns.

## Architecture

### 📁 File Structure

```
AddExternalLayer/
├── components/
│   ├── index.js                    # Component exports
│   ├── FullscreenHeader.js         # Header with fullscreen toggle
│   └── StepNavigation.js           # Step navigation controls
├── steps/
│   ├── index.js                    # Step exports
│   ├── BaseStep.js                 # Abstract base class for steps
│   ├── StepManager.js              # Step lifecycle management
│   ├── SelectLayersStep.js         # Step 1: Layer selection
│   ├── ConfigureLayersStep.js      # Step 2: Layer configuration
│   └── PreviewLayersStep.js        # Step 3: Layer preview (optional)
├── AddExternalLayerViewRefactored.js # Main refactored component
├── addLayerToMap.js                # Layer creation utilities
├── capabilitiesParser.js           # WMS/WMTS parsing
└── README_REFACTORED.md            # This file
```

### 🏗️ Core Components

#### 1. **BaseStep Class**
Abstract base class that defines the interface for all steps:
- `validate(state)` - Validates if step can proceed
- `onEnter(state, setState)` - Called when entering step
- `onExit(state, setState)` - Called when leaving step
- `render(state, handlers)` - Renders step content
- `getNextButtonConfig(state)` - Configures next button
- `getPreviousButtonConfig(state)` - Configures previous button

#### 2. **StepManager Class**
Manages step navigation and lifecycle:
- `addStep(step)` - Add a new step
- `goNext(state, setState)` - Navigate to next step
- `goPrevious(state, setState)` - Navigate to previous step
- `canGoNext(state)` - Check if can proceed
- `getCurrentStep()` - Get current step instance

#### 3. **Step Components**
- **SelectLayersStep** - Service selection and layer picking
- **ConfigureLayersStep** - Layer configuration and settings
- **PreviewLayersStep** - Live preview before adding (optional)

#### 4. **UI Components**
- **StepNavigation** - Stepper and navigation buttons
- **FullscreenHeader** - Title and fullscreen toggle

## 🚀 Usage

### Basic Usage

```javascript
import AddExternalLayerViewRefactored from './AddExternalLayerViewRefactored';

// Use the refactored component
<AddExternalLayerViewRefactored 
  map={map} 
  globalObserver={globalObserver} 
/>
```

### Adding a New Step

1. **Create the step class:**

```javascript
// steps/MyCustomStep.js
import { BaseStep } from './BaseStep';

export class MyCustomStep extends BaseStep {
  constructor() {
    super(4, "My Custom Step", "Description of what this step does");
  }

  validate(state) {
    // Add validation logic
    return { isValid: true };
  }

  onEnter(state, setState) {
    // Initialize step data
    console.log("Entering my custom step");
  }

  render(state, handlers) {
    return (
      <div>
        <h3>My Custom Step Content</h3>
        {/* Your step UI here */}
      </div>
    );
  }

  getNextButtonConfig(state) {
    return {
      text: "Continue to Next",
      disabled: !this.validate(state).isValid,
      icon: <ArrowForwardIcon />
    };
  }
}
```

2. **Add to the step manager:**

```javascript
// In AddExternalLayerViewRefactored.js
import { MyCustomStep } from './steps/MyCustomStep';

const [stepManager] = useState(() => {
  const manager = new StepManager();
  manager.addStep(new SelectLayersStep());
  manager.addStep(new ConfigureLayersStep());
  manager.addStep(new MyCustomStep()); // Add your step
  return manager;
});
```

### Enabling Preview Step

To enable the preview step, simply add it to the step manager:

```javascript
import { PreviewLayersStep } from './steps/PreviewLayersStep';

const [stepManager] = useState(() => {
  const manager = new StepManager();
  manager.addStep(new SelectLayersStep());
  manager.addStep(new ConfigureLayersStep());
  manager.addStep(new PreviewLayersStep()); // Enable preview
  return manager;
});
```

## 🎯 Benefits

### 1. **Modularity**
- Each step is a separate class with clear responsibilities
- Easy to test individual steps in isolation
- Components can be reused across different plugins

### 2. **Extensibility**
- Adding new steps is as simple as creating a new class
- Step order is automatically managed
- Custom validation and lifecycle hooks

### 3. **Maintainability**
- Code is split into logical files (~100-200 lines each)
- Clear separation of concerns
- Consistent interfaces and patterns

### 4. **Flexibility**
- Steps can be enabled/disabled dynamically
- Custom button configurations per step
- Rich lifecycle management (onEnter/onExit)

## 🔧 Advanced Features

### Custom Step Validation

```javascript
validate(state) {
  if (state.selectedLayers.length === 0) {
    return { 
      isValid: false, 
      message: "Please select at least one layer" 
    };
  }
  return { isValid: true };
}
```

### Step Lifecycle Hooks

```javascript
onEnter(state, setState) {
  // Initialize data when entering step
  this.loadStepData(state, setState);
}

onExit(state, setState) {
  // Cleanup when leaving step
  this.cleanupStepData(state, setState);
}
```

### Dynamic Button Configuration

```javascript
getNextButtonConfig(state) {
  const validation = this.validate(state);
  return {
    text: `Process ${state.selectedItems.length} Items`,
    disabled: !validation.isValid,
    icon: <ProcessIcon />,
    color: 'secondary'
  };
}
```

## 🧪 Testing

Each step can be tested independently:

```javascript
// Test a step
const step = new SelectLayersStep();
const mockState = { selectedLayers: [] };
const validation = step.validate(mockState);
expect(validation.isValid).toBe(false);
```

## 🔄 Migration

To migrate from the old component to the refactored version:

1. Replace the import:
```javascript
// Old
import AddExternalLayerView from './AddExternalLayerView';

// New
import AddExternalLayerViewRefactored from './AddExternalLayerViewRefactored';
```

2. Update the component usage (props remain the same):
```javascript
<AddExternalLayerViewRefactored 
  map={map} 
  globalObserver={globalObserver} 
/>
```

## 📈 Performance

- **Lazy loading**: Steps are only rendered when active
- **Efficient state management**: Minimal re-renders
- **Memory management**: Proper cleanup in lifecycle hooks
- **Code splitting**: Each step can be loaded separately

The refactored architecture provides a solid foundation for future enhancements while maintaining all existing functionality.