import React from "react";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    CircularProgress,
    Alert,
    Chip,
    Tooltip,
    IconButton,
    Collapse,
} from "@mui/material";
import {
    Info as InfoIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Clear as ClearIcon,
    ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { BaseStep } from "./BaseStep";
import { parseCapabilities } from "../capabilitiesParser";

export class SelectLayersStep extends BaseStep {
    constructor() {
        super(1, "Select Layers", "Choose service type and select layers to add");
    }

    onEnter(state, setState) {
        console.log("Entering SelectLayersStep");
        // Clear any configuration state when returning to selection
        setState(prev => ({
            ...prev,
            layerConfigurations: {},
            previewLayers: []
        }));
    }

    validate(state) {
        if (state.selectedLayers.length === 0) {
            return {
                isValid: false,
                message: "Please select at least one layer"
            };
        }
        return { isValid: true };
    }

    async handleLoadCapabilities(state, setState, enqueueSnackbar) {
        if (!state.capabilitiesUrl.trim()) {
            setState(prev => ({ ...prev, error: "Please enter a GetCapabilities URL" }));
            return;
        }

        setState(prev => ({
            ...prev,
            loading: true,
            error: "",
            availableLayers: [],
            selectedLayers: []
        }));

        try {
            const layers = await parseCapabilities(state.capabilitiesUrl, state.serviceType);
            setState(prev => ({ ...prev, availableLayers: layers }));
            enqueueSnackbar(`Found ${layers.length} layers`, { variant: "success" });
        } catch (err) {
            const errorMessage = err.message || "Failed to load capabilities";
            setState(prev => ({ ...prev, error: errorMessage }));
            enqueueSnackbar("Failed to load capabilities", { variant: "error" });
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    }

    handleLayerToggle(layerName, state, setState) {
        setState(prev => ({
            ...prev,
            selectedLayers: prev.selectedLayers.includes(layerName)
                ? prev.selectedLayers.filter(name => name !== layerName)
                : [...prev.selectedLayers, layerName]
        }));
    }

    handleCommonServiceSelect(service, state, setState) {
        setState(prev => ({
            ...prev,
            serviceType: service.type,
            capabilitiesUrl: service.url
        }));
    }

    handleClearUrl(state, setState) {
        setState(prev => ({
            ...prev,
            capabilitiesUrl: "",
            error: "",
            availableLayers: [],
            selectedLayers: []
        }));
    }

    toggleLayerExpansion(layerName, state, setState) {
        setState(prev => {
            const newExpandedLayers = new Set(prev.expandedLayers);
            if (newExpandedLayers.has(layerName)) {
                newExpandedLayers.delete(layerName);
            } else {
                newExpandedLayers.add(layerName);
            }
            return { ...prev, expandedLayers: newExpandedLayers };
        });
    }

    render(state, handlers) {
        const { enqueueSnackbar } = handlers;

        // Common WMS/WMTS service URLs for quick access
        const commonServices = [
            {
                name: "PDOK Luchtfoto WMS",
                url: "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?",
                type: "WMS",
            },
            {
                name: "PDOK BRT Achtergrondkaart WMS",
                url: "https://service.pdok.nl/brt/achtergrondkaart/wms/v2_0?",
                type: "WMS",
            },
            {
                name: "PDOK Luchtfoto WMTS",
                url: "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/WMTSCapabilities.xml",
                type: "WMTS",
            },
        ];

        return (
            <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Service Type</InputLabel>
                    <Select
                        value={state.serviceType}
                        label="Service Type"
                        onChange={(e) => handlers.setState(prev => ({ ...prev, serviceType: e.target.value }))}
                    >
                        <MenuItem value="WMS">WMS</MenuItem>
                        <MenuItem value="WMTS">WMTS</MenuItem>
                    </Select>
                </FormControl>

                {/* Common Services */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Quick Access:
                </Typography>
                <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {commonServices
                        .filter((service) => service.type === state.serviceType)
                        .map((service, index) => (
                            <Chip
                                key={index}
                                label={service.name}
                                onClick={() => this.handleCommonServiceSelect(service, state, handlers.setState)}
                                variant="outlined"
                                size="small"
                            />
                        ))}
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-end", mb: 2 }}>
                    <TextField
                        fullWidth
                        label="GetCapabilities URL"
                        value={state.capabilitiesUrl}
                        onChange={(e) => handlers.setState(prev => ({ ...prev, capabilitiesUrl: e.target.value }))}
                        placeholder={`Enter ${state.serviceType} GetCapabilities URL`}
                    />
                    {state.capabilitiesUrl && (
                        <IconButton onClick={() => this.handleClearUrl(state, handlers.setState)} sx={{ ml: 1 }}>
                            <ClearIcon />
                        </IconButton>
                    )}
                </Box>

                <Button
                    variant="contained"
                    onClick={() => this.handleLoadCapabilities(state, handlers.setState, enqueueSnackbar)}
                    disabled={state.loading || !state.capabilitiesUrl.trim()}
                    fullWidth
                    sx={{ mb: 2 }}
                >
                    {state.loading ? <CircularProgress size={24} /> : "Load Layers"}
                </Button>

                {state.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {state.error}
                    </Alert>
                )}

                {state.availableLayers.length > 0 && (
                    <>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                            <Typography variant="subtitle1">
                                Available Layers ({state.availableLayers.length})
                            </Typography>
                            <Tooltip title="Select layers to add to the map">
                                <IconButton size="small">
                                    <InfoIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <List
                            sx={{
                                maxHeight: 200,
                                overflow: "auto",
                                mb: 2,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                            }}
                        >
                            {state.availableLayers.map((layer) => (
                                <ListItem key={layer.name} dense>
                                    <Checkbox
                                        checked={state.selectedLayers.includes(layer.name)}
                                        onChange={() => this.handleLayerToggle(layer.name, state, handlers.setState)}
                                    />
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: "medium" }}
                                                >
                                                    {layer.title || layer.name}
                                                </Typography>
                                                {layer.abstract && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => this.toggleLayerExpansion(layer.name, state, handlers.setState)}
                                                        sx={{ ml: 1 }}
                                                    >
                                                        {state.expandedLayers.has(layer.name) ? (
                                                            <ExpandLessIcon fontSize="small" />
                                                        ) : (
                                                            <ExpandMoreIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {layer.name}
                                                </Typography>
                                                <Collapse in={state.expandedLayers.has(layer.name)}>
                                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                                        {layer.abstract}
                                                    </Typography>
                                                    {layer.crs && layer.crs.length > 0 && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            CRS: {layer.crs.slice(0, 3).join(", ")}
                                                            {layer.crs.length > 3 &&
                                                                ` (+${layer.crs.length - 3} more)`}
                                                        </Typography>
                                                    )}
                                                </Collapse>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </>
        );
    }

    getNextButtonConfig(state) {
        const validation = this.validate(state);
        return {
            text: `Next: Configure Layers (${state.selectedLayers.length})`,
            disabled: !validation.isValid,
            icon: <ArrowForwardIcon />
        };
    }
}