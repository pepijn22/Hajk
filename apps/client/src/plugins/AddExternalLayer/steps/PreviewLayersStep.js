import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { BaseStep } from "./BaseStep";
import { addLayerToMap } from "../addLayerToMap";

/**
 * Preview Layers Step
 * Shows a live preview of selected layers on the map before final confirmation
 */
export class PreviewLayersStep extends BaseStep {
  constructor() {
    super(3, "Preview Layers", "Preview how the layers will look on the map");
  }

  onEnter(state, setState) {
    // Preview layers will be created in render method when handlers are available
    console.log("Entering preview step");
    // Force a state update to trigger re-render
    setState(prev => ({ ...prev }));
  }

  validate(state) {
    // Always valid since this is the final step
    console.log("PreviewLayersStep validate called, returning true");
    return { isValid: true };
  }

  onExit(state, setState) {
    // Clean up preview layers when leaving this step
    this.cleanupPreviewLayers(state, setState);
  }

  async createPreviewLayers(state, setState) {
    try {
      // Remove any existing preview layers
      if (state.previewLayers) {
        state.previewLayers.forEach(layer => {
          // Get map from handlers since it's not in state
          const map = this.currentHandlers?.map;
          if (map) {
            map.removeLayer(layer);
          }
        });
      }

      // Create preview layers
      const layersToPreview = state.availableLayers.filter((layer) =>
        state.selectedLayers.includes(layer.name)
      );

      const newPreviewLayers = [];
      const map = this.currentHandlers?.map;
      const globalObserver = this.currentHandlers?.globalObserver;
      
      if (!map) {
        throw new Error("Map not available for preview");
      }
      
      layersToPreview.forEach((layer) => {
        const config = state.layerConfigurations[layer.name];
        console.log("Creating preview for layer:", { layer, config });
        
        // Create enhanced layer info with configuration
        const enhancedLayer = {
          ...layer,
          configuredVersion: config.version,
          configuredFormat: config.format,
          configuredTransparent: config.transparent,
          configuredSRS: config.srs,
          configuredStyles: config.styles,
          configuredOpacity: 0.7, // Slightly transparent for preview
          configuredVisible: true,
        };

        const previewLayer = addLayerToMap(map, enhancedLayer, state.serviceType, state.capabilitiesUrl, globalObserver);
        
        // Mark as preview layer
        previewLayer.set('isPreviewLayer', true);
        previewLayer.setOpacity(0.7); // Make it slightly transparent
        
        newPreviewLayers.push(previewLayer);
      });

      setState(prev => ({ ...prev, previewLayers: newPreviewLayers }));
      
      // Show success message
      const enqueueSnackbar = this.currentHandlers?.enqueueSnackbar;
      if (enqueueSnackbar) {
        enqueueSnackbar(`Preview loaded for ${newPreviewLayers.length} layer${newPreviewLayers.length > 1 ? 's' : ''}`, { 
          variant: "info" 
        });
      }
    } catch (err) {
      console.error("Failed to create preview:", err);
      const enqueueSnackbar = this.currentHandlers?.enqueueSnackbar;
      if (enqueueSnackbar) {
        enqueueSnackbar("Failed to create layer preview", { variant: "error" });
      }
    }
  }

  cleanupPreviewLayers(state, setState) {
    if (state.previewLayers) {
      const map = this.currentHandlers?.map;
      if (map) {
        state.previewLayers.forEach(layer => {
          map.removeLayer(layer);
        });
      }
      setState(prev => ({ ...prev, previewLayers: [] }));
    }
  }

  render(state, handlers) {
    // Store handlers reference for use in lifecycle methods
    this.currentHandlers = handlers;
    
    console.log("Rendering PreviewLayersStep", { 
      selectedLayers: state.selectedLayers.length,
      previewLayers: state.previewLayers?.length || 0 
    });
    
    // Create preview layers if they don't exist yet
    if (!state.previewLayers || state.previewLayers.length === 0) {
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        console.log("Creating preview layers...");
        this.createPreviewLayers(state, handlers.setState);
      }, 100);
    }
    
    return (
      <>
        <Typography variant="subtitle1" gutterBottom>
          Preview Layers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The selected layers are now visible on the map with your configured settings. 
          Review how they look and decide whether to add them permanently or go back to adjust the configuration.
        </Typography>

        {/* Preview layer information */}
        <Box sx={{ maxHeight: 250, overflow: "auto", mb: 2 }}>
          {state.selectedLayers.map((layerName) => {
            const layer = state.availableLayers.find((l) => l.name === layerName);
            const config = state.layerConfigurations[layerName];
            
            if (!layer || !config) return null;

            return (
              <Card key={layerName} sx={{ mb: 2, bgcolor: 'action.hover' }}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      bgcolor: 'primary.main', 
                      borderRadius: '50%', 
                      mr: 2,
                      opacity: 0.7
                    }} />
                    <Typography variant="h6">
                      {config.title}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{config.layerType}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Version</Typography>
                      <Typography variant="body2">{config.version}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Format</Typography>
                      <Typography variant="body2">{config.format}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">SRS</Typography>
                      <Typography variant="body2">{config.srs}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Style</Typography>
                      <Typography variant="body2">{config.styles}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Transparent</Typography>
                      <Typography variant="body2">{config.transparent ? 'Yes' : 'No'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Preview Status</Typography>
                      <Typography variant="body2" color="info.main">👁️ Currently visible on map (70% opacity)</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Preview Mode:</strong> The layers are temporarily added to the map with 70% opacity. 
            Look at the map to see how they appear with your current configuration.
          </Typography>
        </Alert>
      </>
    );
  }

  getNextButtonConfig(state) {
    return {
      text: `✅ Add ${state.selectedLayers.length} Layer${state.selectedLayers.length > 1 ? "s" : ""} to Map`,
      disabled: false,
      icon: null
    };
  }

  getPreviousButtonConfig(state) {
    return {
      text: "Back to Configure",
      disabled: false,
      icon: <ArrowBackIcon />
    };
  }
}