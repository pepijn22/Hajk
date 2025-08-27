import React from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
} from "@mui/material";
import {
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { BaseStep } from "./BaseStep";

export class ConfigureLayersStep extends BaseStep {
    constructor() {
        super(2, "Configure Layers", "Review and configure settings for each selected layer");
    }

    onEnter(state, setState) {
        console.log("Entering ConfigureLayersStep");
        
        // Check if we're in edit mode
        if (state.editMode && state.editData) {
            this.initializeEditMode(state, setState);
        } else {
            // Initialize layer configurations when entering this step (normal add mode)
            if (Object.keys(state.layerConfigurations).length === 0) {
                this.initializeLayerConfigurations(state, setState);
            }
        }
    }

    onExit(state, setState) {
        console.log("Exiting ConfigureLayersStep");
        // Any cleanup when leaving this step
    }

    initializeEditMode(state, setState) {
        const { editData } = state;
        
        // Get the current name from the DOM (in case it was updated previously)
        const currentName = this.getCurrentNameFromDOM(editData) || 
                           editData.layerCaption || 
                           editData.groupName || 
                           editData.layerId || 
                           editData.groupId;
        
        const layerKey = editData.layerId || editData.groupId || 'edit-item';
        
        console.log("Initializing edit mode with current name:", currentName);
        
        // Set up the state for editing (simplified for name editing only)
        setState(prev => ({
            ...prev,
            // Create a simple layer entry for editing
            availableLayers: [{
                name: layerKey,
                title: currentName,
                abstract: "",
            }],
            selectedLayers: [layerKey],
            layerConfigurations: {
                [layerKey]: {
                    title: currentName,
                    layerName: layerKey,
                    layerType: editData.layerType || "layer"
                }
            }
        }));
    }

    // LocalStorage helper functions for tracking layer/group names
    getStoredName(type, id) {
        try {
            const key = `hajk_${type}_${id}`;
            const storedName = localStorage.getItem(key);
            console.log(`Getting stored name for ${type} ${id}:`, storedName);
            return storedName;
        } catch (error) {
            console.warn("Error getting stored name:", error);
            return null;
        }
    }

    getCurrentNameFromDOM(editData, state) {
        try {
            if (editData.layerType === "group") {
                // Strategy 1: Check localStorage first (most reliable for repeat edits)
                const storedName = this.getStoredName('group', editData.groupId);
                if (storedName) {
                    console.log("Found current group name from localStorage:", storedName);
                    return storedName;
                }
                
                // Strategy 2: Try to find by group ID if it exists in data attributes
                let currentElement = document.querySelector(`[data-group-id="${editData.groupId}"]`);
                if (currentElement) {
                    const nameElement = currentElement.querySelector('.MuiListItemText-primary');
                    if (nameElement) {
                        const currentName = nameElement.textContent.trim();
                        console.log("Found current group name by ID:", currentName);
                        return currentName;
                    }
                }
                
                // Strategy 3: Search by position if available
                if (editData.groupPosition >= 0) {
                    const accordionHeaders = document.querySelectorAll('[role="button"] .MuiListItemText-primary');
                    if (editData.groupPosition < accordionHeaders.length) {
                        const elementAtPosition = accordionHeaders[editData.groupPosition];
                        if (elementAtPosition && elementAtPosition.textContent) {
                            const currentName = elementAtPosition.textContent.trim();
                            console.log("Found current group name by position:", currentName);
                            return currentName;
                        }
                    }
                }
                
                // Strategy 4: Search by original name (fallback)
                const groupTitleElements = document.querySelectorAll('.MuiListItemText-primary');
                for (let element of groupTitleElements) {
                    if (element.textContent && 
                        (element.textContent.trim() === editData.groupName ||
                         element.textContent.trim() === editData.layerCaption)) {
                        const currentName = element.textContent.trim();
                        console.log("Found current group name by original name:", currentName);
                        return currentName;
                    }
                }
                
                // Strategy 5: Final fallback - return the original name
                console.warn("Could not find group element, using original name");
                return editData.groupName || editData.layerCaption;
                
            } else {
                // For individual layers, check localStorage first
                const storedName = this.getStoredName('layer', editData.layerId);
                if (storedName) {
                    console.log("Found current layer name from localStorage:", storedName);
                    return storedName;
                }
                
                // Try to get from the map layer
                if (state.map) {
                    const allLayers = state.map.getLayers().getArray();
                    const layer = allLayers.find(layer => {
                        const layerName = layer.get('name');
                        const layerId = layer.get('id');
                        return layerName === editData.layerId || 
                               layerId === editData.layerId ||
                               layerName === editData.layerCaption;
                    });
                    
                    if (layer) {
                        const currentName = layer.get('caption') || layer.get('name');
                        console.log("Found current layer name from map:", currentName);
                        return currentName;
                    }
                }
            }
        } catch (error) {
            console.warn("Could not get current name from DOM/map:", error);
        }
        
        return null;
    }

    getExistingLayerFromMap(editData, map) {
        if (!map || !editData) return null;
        
        // Get all layers from the map
        const allLayers = map.getLayers().getArray();
        
        // Find the layer by ID or name
        return allLayers.find(layer => {
            const layerName = layer.get('name');
            const layerId = layer.get('id');
            
            return layerName === editData.layerId || 
                   layerId === editData.layerId ||
                   layerName === editData.layerCaption;
        });
    }

    extractLayerConfiguration(layer, editData) {
        // Extract configuration from the existing OpenLayers layer
        const source = layer.getSource();
        const layerName = layer.get('name') || editData.layerId || 'unknown';
        
        // Determine layer type
        const layerType = source.getUrls ? 'WMTS' : 'WMS';
        
        // Extract URL
        let capabilitiesUrl = '';
        if (layerType === 'WMS' && source.getUrl) {
            capabilitiesUrl = source.getUrl();
        } else if (layerType === 'WMTS' && source.getUrls) {
            const urls = source.getUrls();
            capabilitiesUrl = urls[0] || '';
        }
        
        // Extract parameters
        const params = source.getParams ? source.getParams() : {};
        
        return {
            layerName: layerName,
            layerType: layerType,
            title: editData.layerCaption || layer.get('caption') || layerName,
            abstract: layer.get('abstract') || "",
            version: params.VERSION || (layerType === 'WMS' ? '1.3.0' : '1.0.0'),
            format: params.FORMAT || 'image/png',
            transparent: params.TRANSPARENT !== 'false',
            srs: params.CRS || params.SRS || 'EPSG:28992',
            styles: params.STYLES || 'default',
            opacity: layer.getOpacity() || 1,
            visible: layer.getVisible(),
            capabilitiesUrl: capabilitiesUrl,
            crs: ['EPSG:28992', 'EPSG:3857', 'EPSG:4326'],
            availableFormats: ['image/png', 'image/jpeg', 'image/gif'],
            availableStyles: [
                { name: 'default', title: 'Default' },
                { name: params.STYLES || 'default', title: params.STYLES || 'Current Style' }
            ].filter((style, index, self) => 
                index === self.findIndex(s => s.name === style.name)
            )
        };
    }

    initializeLayerConfigurations(state, setState) {
        const configs = {};
        const layersToAdd = state.availableLayers.filter((layer) =>
            state.selectedLayers.includes(layer.name)
        );

        layersToAdd.forEach((layer) => {
            const availableFormats = state.serviceType === "WMS"
                ? ["image/png", "image/jpeg", "image/gif"]
                : layer.formats || ["image/png"];
            const defaultFormat = availableFormats.includes("image/png")
                ? "image/png"
                : availableFormats[0];

            configs[layer.name] = {
                layerType: state.serviceType,
                version: state.serviceType === "WMS" ? "1.3.0" : "1.0.0",
                format: defaultFormat,
                transparent: true,
                srs: state.serviceType === "WMS" ? "EPSG:28992" : layer.crs?.[0] || "EPSG:28992",
                styles: layer.styles?.[0]?.Name || layer.styles?.[0]?.name || "default",
                opacity: 1,
                visible: true,
                title: layer.title || layer.name,
                abstract: layer.abstract || "",
                crs: layer.crs || [],
                availableFormats: availableFormats,
                availableStyles: layer.styles && layer.styles.length > 0
                    ? layer.styles.map(style => ({
                        name: style.Name || style.name || "default",
                        title: style.Title || style.title || style.Name || style.name || "Default"
                    }))
                    : [{ name: "default", title: "Default" }]
            };
        });

        setState(prev => ({ ...prev, layerConfigurations: configs }));
    }

    handleConfigurationChange(layerName, property, value, state, setState) {
        setState(prev => ({
            ...prev,
            layerConfigurations: {
                ...prev.layerConfigurations,
                [layerName]: {
                    ...prev.layerConfigurations[layerName],
                    [property]: value,
                },
            }
        }));
    }

    render(state, handlers) {
        // If in edit mode, show simple name editing interface
        if (state.editMode && state.editData) {
            return this.renderEditMode(state, handlers);
        }

        // Normal add mode - show full configuration
        return (
            <>
                <Typography variant="subtitle1" gutterBottom>
                    Configure Selected Layers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Review and configure the settings for each selected layer before adding them to the map.
                </Typography>

                {/* Scrollable content area */}
                <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
                    {state.selectedLayers.map((layerName) => {
                        const layer = state.availableLayers.find((l) => l.name === layerName);
                        const config = state.layerConfigurations[layerName];

                        if (!layer || !config) return null;

                        return (
                            <Card key={layerName} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {config.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {config.abstract || "No description available"}
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Layer Type</InputLabel>
                                                <Select
                                                    value={config.layerType}
                                                    label="Layer Type"
                                                    disabled
                                                >
                                                    <MenuItem value="WMS">WMS</MenuItem>
                                                    <MenuItem value="WMTS">WMTS</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Version</InputLabel>
                                                <Select
                                                    value={config.version}
                                                    label="Version"
                                                    onChange={(e) => this.handleConfigurationChange(layerName, 'version', e.target.value, state, handlers.setState)}
                                                >
                                                    {state.serviceType === "WMS" ? [
                                                        <MenuItem key="1.1.1" value="1.1.1">1.1.1</MenuItem>,
                                                        <MenuItem key="1.3.0" value="1.3.0">1.3.0</MenuItem>
                                                    ] : [
                                                        <MenuItem key="1.0.0" value="1.0.0">1.0.0</MenuItem>
                                                    ]}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Format</InputLabel>
                                                <Select
                                                    value={config.format}
                                                    label="Format"
                                                    onChange={(e) => this.handleConfigurationChange(layerName, 'format', e.target.value, state, handlers.setState)}
                                                >
                                                    {config.availableFormats.map((format) => (
                                                        <MenuItem key={format} value={format}>
                                                            {format}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>SRS/CRS</InputLabel>
                                                <Select
                                                    value={config.srs}
                                                    label="SRS/CRS"
                                                    onChange={(e) => this.handleConfigurationChange(layerName, 'srs', e.target.value, state, handlers.setState)}
                                                >
                                                    <MenuItem value="EPSG:28992">EPSG:28992 (RD New)</MenuItem>
                                                    <MenuItem value="EPSG:3857">EPSG:3857 (Web Mercator)</MenuItem>
                                                    <MenuItem value="EPSG:4326">EPSG:4326 (WGS84)</MenuItem>
                                                    {config.crs.map((crs) => (
                                                        <MenuItem key={crs} value={crs}>
                                                            {crs}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Style</InputLabel>
                                                <Select
                                                    value={config.styles}
                                                    label="Style"
                                                    onChange={(e) => this.handleConfigurationChange(layerName, 'styles', e.target.value, state, handlers.setState)}
                                                >
                                                    {config.availableStyles.map((style) => (
                                                        <MenuItem key={style.name} value={style.name}>
                                                            {style.title || style.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Transparent</InputLabel>
                                                <Select
                                                    value={config.transparent}
                                                    label="Transparent"
                                                    onChange={(e) => this.handleConfigurationChange(layerName, 'transparent', e.target.value, state, handlers.setState)}
                                                >
                                                    <MenuItem value={true}>Yes</MenuItem>
                                                    <MenuItem value={false}>No</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                Layer Name: {layerName}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            </>
        );
    }

    renderEditMode(state, handlers) {
        const { editData } = state;
        const isGroup = editData.layerType === "group";
        const currentName = editData.layerCaption || editData.groupName || editData.layerId || editData.groupId;
        
        // Get the current name from the configuration if available
        const layerName = state.selectedLayers[0];
        const config = state.layerConfigurations[layerName];
        const displayName = config?.title || currentName;

        return (
            <>
                <Typography variant="subtitle1" gutterBottom>
                    {isGroup ? "Edit Group Name" : "Edit Layer Name"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {isGroup 
                        ? "Change the display name for this layer group."
                        : "Change the display name for this layer."
                    }
                </Typography>

                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label={isGroup ? "Group Name" : "Layer Name"}
                                    value={displayName}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        // Update the configuration with the new name
                                        this.handleConfigurationChange(layerName, 'title', newName, state, handlers.setState);
                                    }}
                                    variant="outlined"
                                    size="small"
                                    helperText={isGroup 
                                        ? "This name will be displayed in the layer switcher for the group"
                                        : "This name will be displayed in the layer switcher for the layer"
                                    }
                                />
                            </Grid>
                            
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    {isGroup ? "Group ID: " : "Layer ID: "}{editData.groupId || editData.layerId}
                                </Typography>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </>
        );
    }

    getNextButtonConfig(state) {
        if (state.editMode) {
            const isGroup = state.editData?.layerType === "group";
            return {
                text: isGroup ? `Update Group` : `Update Layer`,
                disabled: false,
                icon: <ArrowForwardIcon />
            };
        }
        
        return {
            text: `Next: Preview Layers (${state.selectedLayers.length})`,
            disabled: false,
            icon: <ArrowForwardIcon />
        };
    }

    getPreviousButtonConfig(state) {
        return {
            text: "Back to Selection",
            disabled: false,
            icon: <ArrowBackIcon />
        };
    }
}