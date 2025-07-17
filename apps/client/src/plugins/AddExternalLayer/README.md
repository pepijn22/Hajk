# AddExternalLayer Plugin

A HAJK v3 plugin that allows users to dynamically add WMS or WMTS layers to the map at runtime.

## Features

- **Service Support**: WMS and WMTS services
- **GetCapabilities Parsing**: Automatically parses service capabilities to list available layers
- **Layer Selection**: Multi-select interface with layer details
- **Quick Access**: Pre-configured common services for easy testing
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Layer Management**: Added layers appear in the LayerSwitcher and can be toggled

## Usage

1. Click the "Add External Layer" button in the toolbar/drawer
2. Select service type (WMS or WMTS)
3. Either:
   - Use a quick access service by clicking on the chips
   - Enter a custom GetCapabilities URL
4. Click "Load Layers" to fetch available layers
5. Select one or more layers from the list
6. Click "Add Selected Layers to Map"

## Files Structure

```
AddExternalLayer/
├── AddExternalLayer.js          # Main plugin component
├── AddExternalLayerView.js      # UI component with form and layer list
├── capabilitiesParser.js        # WMS/WMTS capabilities parsing logic
├── addLayerToMap.js            # OpenLayers layer creation and map integration
└── README.md                   # This documentation
```

## Technical Details

### OpenLayers Integration

- **WMS Layers**: Uses `ol/source/TileWMS` and `ol/layer/Tile`
- **WMTS Layers**: Uses `ol/source/WMTS` and `ol/layer/Tile` with both template and KVP support
- **Layer Properties**: Layers are marked with metadata for identification and management

### Error Handling

- Network errors (CORS, connectivity issues)
- Invalid XML responses
- Malformed capabilities documents
- Missing required layer properties

### CORS Considerations

Some external services may have CORS restrictions. In production environments, you may need to:
- Use a proxy server
- Configure CORS headers on the target services
- Use services that explicitly allow cross-origin requests

## Configuration

The plugin can be configured in the map configuration by adding it to the tools array:

```json
{
  "type": "AddExternalLayer",
  "options": {
    "target": "toolbar",
    "position": "left",
    "width": 500,
    "height": "dynamic"
  }
}
```

## Dependencies

- OpenLayers 10.4.0+
- Material-UI v5
- React 19+
- notistack (for notifications)

## Browser Support

Supports all modern browsers that support:
- ES6 modules
- Fetch API
- OpenLayers 10.4.0