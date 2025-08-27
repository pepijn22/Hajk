import React, { useState } from "react";
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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Divider,
} from "@mui/material";
import {
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { parseCapabilities } from "./capabilitiesParser";
import { addLayerToMap } from "./addLayerToMap";

function AddExternalLayerView({ app, map, localObserver, globalObserver }) {
  const [serviceType, setServiceType] = useState("WMS");
  const [capabilitiesUrl, setCapabilitiesUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableLayers, setAvailableLayers] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState([]);
  const [expandedLayers, setExpandedLayers] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Select layers, Step 2: Configure layers
  const [layerConfigurations, setLayerConfigurations] = useState({});
  const { enqueueSnackbar } = useSnackbar();

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

  const handleLoadCapabilities = async () => {
    if (!capabilitiesUrl.trim()) {
      setError("Please enter a GetCapabilities URL");
      return;
    }

    setLoading(true);
    setError("");
    setAvailableLayers([]);
    setSelectedLayers([]);

    try {
      const layers = await parseCapabilities(capabilitiesUrl, serviceType);
      setAvailableLayers(layers);
      enqueueSnackbar(`Found ${layers.length} layers`, { variant: "success" });
    } catch (err) {
      setError(err.message || "Failed to load capabilities");
      enqueueSnackbar("Failed to load capabilities", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLayerToggle = (layerName) => {
    setSelectedLayers((prev) =>
      prev.includes(layerName)
        ? prev.filter((name) => name !== layerName)
        : [...prev, layerName]
    );
  };

  const handleCommonServiceSelect = (service) => {
    setServiceType(service.type);
    setCapabilitiesUrl(service.url);
  };

  const handleClearUrl = () => {
    setCapabilitiesUrl("");
    setError("");
    setAvailableLayers([]);
    setSelectedLayers([]);
  };

  const toggleLayerExpansion = (layerName) => {
    setExpandedLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layerName)) {
        newSet.delete(layerName);
      } else {
        newSet.add(layerName);
      }
      return newSet;
    });
  };

  const handleNextStep = () => {
    if (selectedLayers.length === 0) {
      enqueueSnackbar("Please select at least one layer", {
        variant: "warning",
      });
      return;
    }

    // Initialize layer configurations with default values
    const configs = {};
    const layersToAdd = availableLayers.filter((layer) =>
      selectedLayers.includes(layer.name)
    );

    layersToAdd.forEach((layer) => {
      const availableFormats = serviceType === "WMS" ? ["image/png", "image/jpeg", "image/gif"] : layer.formats || ["image/png"];
      const defaultFormat = availableFormats.includes("image/png") ? "image/png" : availableFormats[0];

      configs[layer.name] = {
        layerType: serviceType,
        version: serviceType === "WMS" ? "1.3.0" : "1.0.0",
        format: defaultFormat,
        transparent: true,
        srs: serviceType === "WMS" ? "EPSG:28992" : layer.crs?.[0] || "EPSG:28992",
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

    setLayerConfigurations(configs);
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleConfigurationChange = (layerName, property, value) => {
    setLayerConfigurations((prev) => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        [property]: value,
      },
    }));
  };

  const handleAddToMap = () => {
    try {
      const layersToAdd = availableLayers.filter((layer) =>
        selectedLayers.includes(layer.name)
      );

      layersToAdd.forEach((layer) => {
        const config = layerConfigurations[layer.name];
        console.log("About to add layer with config:", { layer, config });

        // Create enhanced layer info with configuration
        const enhancedLayer = {
          ...layer,
          configuredVersion: config.version,
          configuredFormat: config.format,
          configuredTransparent: config.transparent,
          configuredSRS: config.srs,
          configuredStyles: config.styles,
          configuredOpacity: config.opacity,
          configuredVisible: config.visible,
        };

        const addedLayer = addLayerToMap(map, enhancedLayer, serviceType, capabilitiesUrl, globalObserver);
        console.log("Layer added to map:", {
          layer: addedLayer,
          visible: addedLayer.getVisible(),
          opacity: addedLayer.getOpacity(),
          zIndex: addedLayer.getZIndex(),
          source: addedLayer.getSource(),
          mapLayers: map.getLayers().getLength()
        });

        // Try to notify the LayerSwitcher about the new layer
        if (globalObserver) {
          globalObserver.publish("core.pluginsRerender");
          globalObserver.publish("layerswitcher.refreshLayers");
        }
      });

      enqueueSnackbar(
        `Added ${layersToAdd.length} layer${layersToAdd.length > 1 ? "s" : ""} to map`,
        { variant: "success" }
      );

      // Reset to step 1 and clear selections
      setCurrentStep(1);
      setSelectedLayers([]);
      setLayerConfigurations({});
    } catch (err) {
      enqueueSnackbar("Failed to add layers to map", { variant: "error" });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return renderStep1();
    }
  };

  const renderStep1 = () => (
    <>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Service Type</InputLabel>
        <Select
          value={serviceType}
          label="Service Type"
          onChange={(e) => setServiceType(e.target.value)}
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
          .filter((service) => service.type === serviceType)
          .map((service, index) => (
            <Chip
              key={index}
              label={service.name}
              onClick={() => handleCommonServiceSelect(service)}
              variant="outlined"
              size="small"
            />
          ))}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", mb: 2 }}>
        <TextField
          fullWidth
          label="GetCapabilities URL"
          value={capabilitiesUrl}
          onChange={(e) => setCapabilitiesUrl(e.target.value)}
          placeholder={`Enter ${serviceType} GetCapabilities URL`}
        />
        {capabilitiesUrl && (
          <IconButton onClick={handleClearUrl} sx={{ ml: 1 }}>
            <ClearIcon />
          </IconButton>
        )}
      </Box>

      <Button
        variant="contained"
        onClick={handleLoadCapabilities}
        disabled={loading || !capabilitiesUrl.trim()}
        fullWidth
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : "Load Layers"}
      </Button>



      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {availableLayers.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle1">
              Available Layers ({availableLayers.length})
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
            {availableLayers.map((layer) => (
              <ListItem key={layer.name} dense>
                <Checkbox
                  checked={selectedLayers.includes(layer.name)}
                  onChange={() => handleLayerToggle(layer.name)}
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
                          onClick={() => toggleLayerExpansion(layer.name)}
                          sx={{ ml: 1 }}
                        >
                          {expandedLayers.has(layer.name) ? (
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
                      <Collapse in={expandedLayers.has(layer.name)}>
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

          <Button
            variant="contained"
            color="primary"
            onClick={handleNextStep}
            disabled={selectedLayers.length === 0}
            fullWidth
            startIcon={<ArrowForwardIcon />}
          >
            Next: Configure Layers ({selectedLayers.length})
          </Button>
        </>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <Typography variant="subtitle1" gutterBottom>
        Configure Selected Layers
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review and configure the settings for each selected layer before adding them to the map.
      </Typography>

      {/* Scrollable content area */}
      <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
        {selectedLayers.map((layerName) => {
          const layer = availableLayers.find((l) => l.name === layerName);
          const config = layerConfigurations[layerName];

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
                        onChange={(e) => handleConfigurationChange(layerName, 'version', e.target.value)}
                      >
                        {serviceType === "WMS" ? [
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
                        onChange={(e) => handleConfigurationChange(layerName, 'format', e.target.value)}
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
                        onChange={(e) => handleConfigurationChange(layerName, 'srs', e.target.value)}
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
                        onChange={(e) => handleConfigurationChange(layerName, 'styles', e.target.value)}
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
                        onChange={(e) => handleConfigurationChange(layerName, 'transparent', e.target.value)}
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

      {/* Fixed buttons at bottom - always visible */}
      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
        <Button
          variant="outlined"
          onClick={handlePreviousStep}
          startIcon={<ArrowBackIcon />}
          sx={{ flex: 1 }}
        >
          Back to Selection
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddToMap}
          sx={{ flex: 2 }}
        >
          Add {selectedLayers.length} Layer{selectedLayers.length > 1 ? "s" : ""} to Map
        </Button>
      </Box>
    </>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Add External Layer
      </Typography>

      {/* Stepper */}
      <Stepper activeStep={currentStep - 1} sx={{ mb: 3 }}>
        <Step>
          <StepLabel>Select Layers</StepLabel>
        </Step>
        <Step>
          <StepLabel>Configure Layers</StepLabel>
        </Step>
      </Stepper>

      {/* Step Content */}
      {renderStepContent()}
    </Box>
  );
}

export default AddExternalLayerView;
