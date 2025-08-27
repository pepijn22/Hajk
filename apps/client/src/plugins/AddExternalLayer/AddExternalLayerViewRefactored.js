import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { useSnackbar } from "notistack";

// Step classes
import { SelectLayersStep } from "./steps/SelectLayersStep";
import { ConfigureLayersStep } from "./steps/ConfigureLayersStep";
import { PreviewLayersStep } from "./steps/PreviewLayersStep";
import { StepManager } from "./steps/StepManager";

// Components
import { StepNavigation } from "./components/StepNavigation";
import { FullscreenHeader } from "./components/FullscreenHeader";

// Utilities
import { addLayerToMap } from "./addLayerToMap";

/**
 * Refactored AddExternalLayer Plugin View
 * Uses a modular step-based architecture for better maintainability
 */
function AddExternalLayerViewRefactored({ app, map, localObserver, globalObserver }) {
    // Plugin state
    const [state, setState] = useState({
        // Service configuration
        serviceType: "WMS",
        capabilitiesUrl: "",

        // Loading and error states
        loading: false,
        error: "",

        // Layer data
        availableLayers: [],
        selectedLayers: [],
        expandedLayers: new Set(),
        layerConfigurations: {},
        previewLayers: [], // For preview step functionality

        // UI state
        isFullscreen: false,
    });

    const { enqueueSnackbar } = useSnackbar();

    // Initialize step manager
    const [stepManager] = useState(() => {
        const manager = new StepManager();
        manager.addStep(new SelectLayersStep());
        manager.addStep(new ConfigureLayersStep());
        // Enable the preview step (3-step workflow)
        manager.addStep(new PreviewLayersStep());
        return manager;
    });

    // Initialize first step
    useEffect(() => {
        const firstStep = stepManager.getCurrentStep();
        if (firstStep && firstStep.onEnter) {
            firstStep.onEnter(state, setState);
        }
    }, [stepManager]);

    // Listen for step navigation events from edit buttons
    useEffect(() => {
        const handleGoToStep = (data) => {
            const { step, editMode, layerId, layerCaption, groupId, groupName, layerType } = data;

            if (editMode && step === 2) {
                // Navigate to step 2 (Configure Layers)
                stepManager.goToStep(2, state, setState);

                // For groups, find the current name and position in the DOM
                let currentGroupName = groupName;
                let groupPosition = -1;

                if (layerType === "group") {
                    const groupInfo = findGroupInDOM(groupId, groupName);
                    if (groupInfo) {
                        currentGroupName = groupInfo.currentName;
                        groupPosition = groupInfo.position;
                        console.log("Found group in DOM:", { currentName: currentGroupName, position: groupPosition });
                    }
                }

                // Set edit mode state with layer/group information
                setState(prev => ({
                    ...prev,
                    editMode: true,
                    editData: {
                        layerId,
                        layerCaption,
                        groupId,
                        groupName: currentGroupName, // Use the current name from DOM
                        layerType,
                        groupPosition // Store the position for future reference
                    }
                }));

                console.log("Edit mode activated for:", { layerId, layerCaption, groupId, groupName: currentGroupName, layerType, groupPosition });
            }
        };

        // Subscribe to the step navigation event
        if (globalObserver) {
            globalObserver.subscribe("addexternallayer.goToStep", handleGoToStep);
        }

        // Cleanup subscription
        return () => {
            if (globalObserver) {
                globalObserver.unsubscribe("addexternallayer.goToStep", handleGoToStep);
            }
        };
    }, [globalObserver, stepManager, state]);

    // LocalStorage helper functions for tracking layer/group names
    const getStoredName = (type, id) => {
        try {
            const key = `hajk_${type}_${id}`;
            const storedName = localStorage.getItem(key);
            console.log(`Getting stored name for ${type} ${id}:`, storedName);
            return storedName;
        } catch (error) {
            console.warn("Error getting stored name:", error);
            return null;
        }
    };

    const setStoredName = (type, id, name) => {
        try {
            const key = `hajk_${type}_${id}`;
            localStorage.setItem(key, name);
            console.log(`Stored name for ${type} ${id}:`, name);
        } catch (error) {
            console.warn("Error storing name:", error);
        }
    };

    // Helper function to find a group in the DOM and get its current name
    const findGroupInDOM = (groupId, originalGroupName) => {
        try {
            // First, check if we have a stored name for this group
            const storedName = getStoredName('group', groupId);
            const nameToLookFor = storedName || originalGroupName;

            console.log("Looking for group:", { groupId, originalGroupName, storedName, nameToLookFor });

            const accordionHeaders = document.querySelectorAll('[role="button"] .MuiListItemText-primary');

            // Try to find by the name we should be looking for
            for (let i = 0; i < accordionHeaders.length; i++) {
                const element = accordionHeaders[i];
                if (element.textContent && element.textContent.trim() === nameToLookFor) {
                    const currentName = element.textContent.trim();
                    console.log("Found group in DOM:", { currentName, position: i });
                    return {
                        currentName: currentName,
                        position: i,
                        element: element
                    };
                }
            }

            // If we can't find by stored name, try the original name
            if (storedName && storedName !== originalGroupName) {
                for (let i = 0; i < accordionHeaders.length; i++) {
                    const element = accordionHeaders[i];
                    if (element.textContent && element.textContent.trim() === originalGroupName) {
                        const currentName = element.textContent.trim();
                        console.log("Found group by original name:", { currentName, position: i });
                        return {
                            currentName: currentName,
                            position: i,
                            element: element
                        };
                    }
                }
            }

            console.warn("Could not find group in DOM:", { groupId, originalGroupName, storedName });
            return null;
        } catch (error) {
            console.warn("Error finding group in DOM:", error);
            return null;
        }
    };

    // Fullscreen toggle handler
    const handleFullscreenToggle = () => {
        setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));

        // Notify the parent plugin about fullscreen state change
        if (globalObserver) {
            globalObserver.publish("plugin.fullscreen", {
                plugin: "AddExternalLayer",
                fullscreen: !state.isFullscreen
            });
        }

        enqueueSnackbar(
            state.isFullscreen ? "Exited fullscreen mode" : "Entered fullscreen mode",
            { variant: "info" }
        );
    };

    // Handle adding/updating layers to map (final step action)
    const handleAddToMap = () => {
        try {
            if (state.editMode && state.editData) {
                // Edit mode: Update existing layer
                console.log("Updating existing layer");

                const layerName = state.selectedLayers[0];
                const config = state.layerConfigurations[layerName];

                // Find the existing layer on the map
                const existingLayer = map.getLayers().getArray().find(layer => {
                    const name = layer.get('name');
                    const id = layer.get('id');
                    return name === state.editData.layerId ||
                        id === state.editData.layerId ||
                        name === state.editData.layerCaption;
                });

                if (existingLayer) {
                    // Update the existing layer with new configuration
                    updateExistingLayer(existingLayer, config, state);

                    enqueueSnackbar(
                        `Updated layer: ${config.title}`,
                        { variant: "success" }
                    );
                } else {
                    console.warn("Could not find existing layer to update");
                    enqueueSnackbar("Could not find layer to update", { variant: "error" });
                }
            } else {
                // Normal add mode
                // Check if we have preview layers (Step 3) - convert them to permanent
                if (state.previewLayers && state.previewLayers.length > 0) {
                    console.log("Converting preview layers to permanent layers");

                    // Convert preview layers to permanent layers
                    state.previewLayers.forEach(layer => {
                        // Remove preview properties and make permanent
                        layer.set('isPreviewLayer', false);
                        layer.setOpacity(1); // Set to full opacity
                        console.log("Converted preview layer to permanent:", layer.get('name'));
                    });

                    enqueueSnackbar(
                        `Added ${state.previewLayers.length} layer${state.previewLayers.length > 1 ? "s" : ""} to map`,
                        { variant: "success" }
                    );
                } else {
                    // Fallback: Direct add without preview (shouldn't happen in normal 3-step flow)
                    console.log("Adding layers directly without preview");

                    const layersToAdd = state.availableLayers.filter((layer) =>
                        state.selectedLayers.includes(layer.name)
                    );

                    layersToAdd.forEach((layer) => {
                        const config = state.layerConfigurations[layer.name];
                        console.log("About to add layer with config:", { layer, config });

                        // Create enhanced layer info with configuration
                        const enhancedLayer = {
                            ...layer,
                            configuredVersion: config.version,
                            configuredFormat: config.format,
                            configuredTransparent: config.transparent,
                            configuredSRS: config.srs,
                            configuredStyles: config.styles,
                            configuredOpacity: config.opacity || 1,
                            configuredVisible: config.visible,
                        };

                        const addedLayer = addLayerToMap(map, enhancedLayer, state.serviceType, state.capabilitiesUrl, globalObserver);
                        console.log("Layer added to map:", {
                            layer: addedLayer,
                            visible: addedLayer.getVisible(),
                            opacity: addedLayer.getOpacity(),
                            zIndex: addedLayer.getZIndex(),
                            source: addedLayer.getSource(),
                            mapLayers: map.getLayers().getLength()
                        });
                    });

                    enqueueSnackbar(
                        `Added ${layersToAdd.length} layer${layersToAdd.length > 1 ? "s" : ""} to map`,
                        { variant: "success" }
                    );
                }
            }

            // Try to notify the LayerSwitcher about the changes
            if (globalObserver) {
                globalObserver.publish("core.pluginsRerender");
                globalObserver.publish("layerswitcher.refreshLayers");
            }

            // If in edit mode, close the plugin after update
            if (state.editMode) {
                // Close the plugin window
                if (globalObserver) {
                    globalObserver.publish("addexternallayer.closeWindow");
                }
            }

            // Reset to first step and clear all state
            stepManager.reset(state, setState);
            setState(prev => ({
                ...prev,
                selectedLayers: [],
                layerConfigurations: {},
                previewLayers: [],
                availableLayers: [],
                capabilitiesUrl: "",
                error: "",
                editMode: false,
                editData: null,
            }));
        } catch (err) {
            console.error("Failed to add/update layers:", err);
            enqueueSnackbar("Failed to add/update layers", { variant: "error" });
        }
    };

    // Helper function to update existing layer/group name
    const updateExistingLayer = (layer, config, state) => {
        if (state.editData.layerType === "group") {
            // Handle group name update
            updateGroupName(state.editData.groupId, config.title);
        } else {
            // Handle individual layer name update
            if (layer) {
                layer.set('caption', config.title);

                // Store the new layer name in localStorage for future edits
                setStoredName('layer', state.editData.layerId, config.title);

                console.log("Layer name updated successfully:", {
                    name: layer.get('name'),
                    newCaption: config.title,
                    layerId: layer.get('id')
                });
            } else {
                console.warn("Layer not found for update");
            }
        }
    };

    // Store the last updated group element globally to track it across edits
    const [lastUpdatedGroupInfo, setLastUpdatedGroupInfo] = useState(null);

    // Helper function to update group name in the LayerSwitcher
    const updateGroupName = (groupId, newName) => {
        console.log("Updating group name:", {
            groupId: groupId,
            newName: newName,
            originalName: state.editData.groupName
        });

        // Get the current name from localStorage (most reliable source)
        const storedName = getStoredName('group', groupId);
        const currentName = storedName || state.editData.groupName;

        console.log("Current name from storage:", { storedName, currentName });

        // Method 1: Direct DOM update using localStorage tracking
        setTimeout(() => {
            try {
                let updated = false;
                const accordionHeaders = document.querySelectorAll('[role="button"] .MuiListItemText-primary');

                console.log("Available group names in DOM:",
                    Array.from(accordionHeaders).map((el, index) => `${index}: "${el.textContent?.trim()}"`)
                );

                // Strategy 1: Search by the current name (from localStorage or original)
                accordionHeaders.forEach((element, index) => {
                    if (!updated && element.textContent && element.textContent.trim() === currentName) {
                        const oldName = element.textContent.trim();
                        element.textContent = newName;
                        updated = true;
                        console.log("Updated group name by current name:", oldName, "->", newName, "at position", index);

                        // Store the new name in localStorage for future edits
                        setStoredName('group', groupId, newName);
                    }
                });

                // Strategy 2: If we can't find by current name, try by position
                if (!updated && state.editData.groupPosition >= 0 && state.editData.groupPosition < accordionHeaders.length) {
                    const elementAtPosition = accordionHeaders[state.editData.groupPosition];
                    if (elementAtPosition && elementAtPosition.textContent) {
                        const oldName = elementAtPosition.textContent.trim();
                        elementAtPosition.textContent = newName;
                        updated = true;
                        console.log("Updated group name by position:", state.editData.groupPosition, oldName, "->", newName);

                        // Store the new name in localStorage
                        setStoredName('group', groupId, newName);
                    }
                }

                // Strategy 3: Search by original name (fallback)
                if (!updated && state.editData.groupName) {
                    accordionHeaders.forEach((element, index) => {
                        if (!updated && element.textContent && element.textContent.trim() === state.editData.groupName) {
                            const oldName = element.textContent.trim();
                            element.textContent = newName;
                            updated = true;
                            console.log("Updated group name by original name:", oldName, "->", newName, "at position", index);

                            // Store the new name in localStorage
                            setStoredName('group', groupId, newName);
                        }
                    });
                }

                if (!updated) {
                    console.warn("Could not find group element to update in DOM.");
                    console.warn("Searched for names:", [currentName, state.editData.groupName]);
                    console.warn("Available names:", Array.from(accordionHeaders).map(el => el.textContent?.trim()));
                } else {
                    console.log("Successfully updated group name and stored in localStorage");
                }
            } catch (error) {
                console.warn("Could not update group name in DOM:", error);
            }
        }, 50);

        // Method 2: Try to update via LayerSwitcher events (for proper state management)
        if (globalObserver) {
            // Publish specific event for group name update
            globalObserver.publish("layerswitcher.updateGroupName", {
                groupId: groupId,
                newName: newName,
                oldName: currentName,
                position: state.editData.groupPosition
            });

            // Force a complete refresh of the LayerSwitcher
            setTimeout(() => {
                globalObserver.publish("core.pluginsRerender");
                globalObserver.publish("layerswitcher.refreshLayers");
            }, 100);
        }
    };

    // Helper function to get the current group name from DOM
    const getCurrentGroupNameFromDOM = (editData) => {
        try {
            // Look for the group in the LayerSwitcher
            const accordionHeaders = document.querySelectorAll('[role="button"] .MuiListItemText-primary');

            if (accordionHeaders.length > 0) {
                // For debugging, let's log all available group names
                const availableNames = Array.from(accordionHeaders).map(el => el.textContent?.trim()).filter(Boolean);
                console.log("Available group names in DOM:", availableNames);
                console.log("Looking for group with original name:", editData.groupName);
                console.log("Group position stored:", editData.groupPosition);

                // Strategy 1: Use the stored position (most reliable for subsequent edits)
                if (editData.groupPosition >= 0 && editData.groupPosition < accordionHeaders.length) {
                    const elementAtPosition = accordionHeaders[editData.groupPosition];
                    if (elementAtPosition && elementAtPosition.textContent) {
                        const currentName = elementAtPosition.textContent.trim();
                        console.log("Found group by position:", editData.groupPosition, "->", currentName);
                        return currentName;
                    }
                }

                // Strategy 2: Try to find by the original name (first time editing)
                if (editData.groupName) {
                    for (let element of accordionHeaders) {
                        if (element.textContent && element.textContent.trim() === editData.groupName) {
                            console.log("Found group by original name:", editData.groupName);
                            return element.textContent.trim();
                        }
                    }
                }

                // Strategy 3: Try to match by group ID if available
                if (editData.groupId) {
                    console.log("Trying to find group by ID:", editData.groupId);

                    // Look for elements that might have the group ID in their attributes or nearby elements
                    const layerSwitcherRoot = document.querySelector('#layer-switcher-view-root');
                    if (layerSwitcherRoot) {
                        // Try to find by data attributes or other identifiers
                        const groupElement = layerSwitcherRoot.querySelector(`[data-group-id="${editData.groupId}"]`);
                        if (groupElement) {
                            const nameElement = groupElement.querySelector('.MuiListItemText-primary');
                            if (nameElement) {
                                console.log("Found group by ID:", nameElement.textContent.trim());
                                return nameElement.textContent.trim();
                            }
                        }
                    }
                }

                // Strategy 4: Final fallback - use original name
                console.warn("Could not find group by position, name, or ID. Using original name as fallback.");
                return editData.groupName;
            }
        } catch (error) {
            console.warn("Error getting current group name from DOM:", error);
        }

        return editData.groupName; // Final fallback to original name
    };

    // Step navigation handlers
    const handleStepNext = () => {
        // Additional logic when moving to next step
        console.log(`Moved to step ${stepManager.getCurrentStepNumber()}`);
    };

    const handleStepPrevious = () => {
        // Additional logic when moving to previous step
        console.log(`Moved to step ${stepManager.getCurrentStepNumber()}`);
    };

    // Render current step content
    const renderCurrentStep = () => {
        const currentStep = stepManager.getCurrentStep();
        const currentStepNumber = stepManager.getCurrentStepNumber();

        if (!currentStep) {
            return <div>No step available</div>;
        }

        const handlers = {
            setState,
            enqueueSnackbar,
            map,
            globalObserver,
        };

        // Pass map reference to state so steps can access it
        if (!state.map) {
            setState(prev => ({ ...prev, map }));
        }

        // Use key prop to force re-render when step changes
        return (
            <Box key={`step-${currentStepNumber}`}>
                {currentStep.render(state, handlers)}
            </Box>
        );
    };

    return (
        <Box sx={{
            p: 2,
            ...(state.isFullscreen && {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                backgroundColor: 'background.paper',
                overflow: 'auto'
            })
        }}>
            {/* Header with title and fullscreen button */}
            <FullscreenHeader
                title={state.editMode ? "Edit Layer" : "Add External Layer"}
                isFullscreen={state.isFullscreen}
                onFullscreenToggle={handleFullscreenToggle}
            />

            {/* Current Step Content */}
            <Box sx={{ mt: 2, mb: 2 }} key={`step-container-${stepManager.getCurrentStepNumber()}`}>
                {renderCurrentStep()}
            </Box>

            {/* Step Navigation */}
            <StepNavigation
                stepManager={stepManager}
                state={state}
                setState={setState}
                onNext={handleStepNext}
                onPrevious={handleStepPrevious}
                onFinish={handleAddToMap}
                enqueueSnackbar={enqueueSnackbar}
            />
        </Box>
    );
}

export default AddExternalLayerViewRefactored;