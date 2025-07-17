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
} from "@mui/material";
import {
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
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
  const { enqueueSnackbar } = useSnackbar();

  // Common WMS/WMTS service URLs for quick access
  const commonServices = [
    {
      name: "OpenStreetMap WMS",
      url: "https://ows.terrestris.de/osm/service?",
      type: "WMS",
    },
    {
      name: "NASA GIBS WMTS",
      url: "https://map1.vis.earthdata.nasa.gov/wmts-geo/1.0.0/WMTSCapabilities.xml",
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

  const handleAddToMap = () => {
    if (selectedLayers.length === 0) {
      enqueueSnackbar("Please select at least one layer", {
        variant: "warning",
      });
      return;
    }

    try {
      const layersToAdd = availableLayers.filter((layer) =>
        selectedLayers.includes(layer.name)
      );

      layersToAdd.forEach((layer) => {
        addLayerToMap(map, layer, serviceType, capabilitiesUrl);
      });

      enqueueSnackbar(
        `Added ${layersToAdd.length} layer${layersToAdd.length > 1 ? "s" : ""} to map`,
        { variant: "success" }
      );

      // Clear selections after adding
      setSelectedLayers([]);
    } catch (err) {
      enqueueSnackbar("Failed to add layers to map", { variant: "error" });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Add External Layer
      </Typography>

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
              maxHeight: 300,
              overflow: "auto",
              mb: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {availableLayers.map((layer) => (
              <React.Fragment key={layer.name}>
                <ListItem dense>
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
              </React.Fragment>
            ))}
          </List>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAddToMap}
            disabled={selectedLayers.length === 0}
            fullWidth
          >
            Add Selected Layers to Map ({selectedLayers.length})
          </Button>
        </>
      )}
    </Box>
  );
}

export default AddExternalLayerView;
