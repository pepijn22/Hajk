import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";

/**
 * Add a WMS or WMTS layer to the OpenLayers map
 * @param {ol.Map} map - OpenLayers map instance
 * @param {Object} layerInfo - Layer information from capabilities
 * @param {string} serviceType - "WMS" or "WMTS"
 * @param {string} capabilitiesUrl - Original capabilities URL
 */
export function addLayerToMap(map, layerInfo, serviceType, capabilitiesUrl, globalObserver = null) {
  try {
    console.log("Adding layer to map:", {
      layerInfo,
      serviceType,
      capabilitiesUrl,
      mapLayers: map.getLayers().getLength(),
    });

    let layer;

    if (serviceType === "WMS") {
      layer = createWMSLayer(layerInfo, capabilitiesUrl, map);
    } else if (serviceType === "WMTS") {
      layer = createWMTSLayer(layerInfo, capabilitiesUrl, map);
    } else {
      throw new Error(`Unsupported service type: ${serviceType}`);
    }

    // Add layer to map
    map.addLayer(layer);

    // Set a high z-index to ensure it appears on top of other layers
    const currentLayers = map.getLayers().getArray();
    const maxZIndex = Math.max(
      ...currentLayers.map((l) => l.getZIndex() || 0),
      1000
    );
    layer.setZIndex(maxZIndex + 1);

    console.log("Layer added successfully:", {
      layerName: layer.get("name"),
      layerCaption: layer.get("caption"),
      layerVisible: layer.getVisible(),
      layerOpacity: layer.getOpacity(),
      layerZIndex: layer.getZIndex(),
      totalMapLayers: map.getLayers().getLength(),
      layerSource: layer.getSource().constructor.name,
    });

    // Force a map refresh
    map.render();

    // Try to trigger LayerSwitcher refresh
    setTimeout(() => {
      map.dispatchEvent("change");
      map.render();

      // Force LayerSwitcher to refresh
      map.getLayers().changed();

      // If this is a Dutch service, zoom to Netherlands extent and switch to OpenStreetMap
      if (layerInfo.serviceUrl && layerInfo.serviceUrl.includes('pdok.nl')) {
        console.log("Switching to OpenStreetMap and zooming to Netherlands extent for Dutch layer");

        // Switch to OpenStreetMap background
        const layers = map.getLayers().getArray();
        console.log("Available layers:", layers.map(l => ({
          name: l.get('name') || 'unnamed',
          caption: l.get('caption') || 'no caption',
          layerType: l.get('layerType') || 'no type',
          visible: l.getVisible()
        })));

        let osmFound = false;
        layers.forEach(layer => {
          const layerName = (layer.get('name') || '').toLowerCase();
          const layerCaption = (layer.get('caption') || '').toLowerCase();
          const layerType = layer.get('layerType');

          // Turn off other base layers
          if (layerType === 'base') {
            layer.setVisible(false);
            console.log("Turned off base layer:", layer.get('name') || layer.get('caption'));
          }

          // Enable OpenStreetMap if available (check multiple possible names)
          if (layerName.includes('openstreetmap') || layerName.includes('osm') ||
            layerCaption.includes('openstreetmap') || layerCaption.includes('osm') ||
            layerName.includes('street') || layerCaption.includes('street')) {
            layer.setVisible(true);
            osmFound = true;
            console.log("Switched to OpenStreetMap background:", layer.get('name') || layer.get('caption'));
          }
        });

        if (!osmFound) {
          console.log("OpenStreetMap layer not found, trying to enable OSM through LayerSwitcher");
        }

        // Also try to enable OSM through the LayerSwitcher if available
        if (globalObserver) {
          globalObserver.publish("layerswitcher.enableOSM");
          globalObserver.publish("core.enableOSM");

          // Try to switch background through LayerSwitcher
          setTimeout(() => {
            globalObserver.publish("layerswitcher.switchToOSM");
            globalObserver.publish("backgroundSwitcher.enableOSM");
          }, 500);
        }

        // Force enable OSM if it exists in the map config
        setTimeout(() => {
          const layers = map.getLayers().getArray();
          layers.forEach(layer => {
            // Check for OSM layer by source type or URL
            const source = layer.getSource();
            if (source && source.getUrls) {
              const urls = source.getUrls();
              if (urls && urls.some(url => url.includes('openstreetmap') || url.includes('osm'))) {
                layer.setVisible(true);
                console.log("Force enabled OSM layer by URL detection");
              }
            }
          });
        }, 1000);

        // Zoom to Netherlands - use coordinates appropriate for current map projection
        const currentProjection = map.getView().getProjection().getCode();
        console.log("Current map projection for zoom:", currentProjection);

        if (currentProjection === "EPSG:28992") {
          // Use EPSG:28992 coordinates (Netherlands)
          console.log("Using EPSG:28992 coordinates for Netherlands");
          map.getView().fit([10000, 305000, 280000, 620000], {
            duration: 1500,
            padding: [50, 50, 50, 50]
          });
        } else {
          // Use Web Mercator coordinates for Netherlands (approximate)
          console.log("Using Web Mercator coordinates for Netherlands");
          map.getView().fit([556597, 6679169, 1086677, 7103677], {
            duration: 1500,
            padding: [50, 50, 50, 50]
          });

          // Alternative: Set center and zoom for Netherlands in Web Mercator
          setTimeout(() => {
            map.getView().setCenter([821637, 6891423]); // Netherlands center in Web Mercator
            map.getView().setZoom(7); // Appropriate zoom level for Netherlands
          }, 1600);
        }
      }
    }, 100);

    return layer;
  } catch (error) {
    console.error("Error adding layer to map:", error);
    throw error;
  }
}

/**
 * Create a WMS tile layer
 * @param {Object} layerInfo - WMS layer information
 * @param {string} capabilitiesUrl - Capabilities URL
 * @param {ol.Map} map - OpenLayers map instance
 * @returns {ol.layer.Tile} WMS tile layer
 */
function createWMSLayer(layerInfo, capabilitiesUrl, map) {
  console.log("Creating WMS layer:", layerInfo);

  // Get the map's projection
  const mapProjection = map.getView().getProjection().getCode();
  console.log("Map projection:", mapProjection);

  // Force EPSG:28992 for Dutch services (temporary fix)
  const targetProjection = mapProjection === "EPSG:3006" ? "EPSG:28992" : mapProjection;
  console.log("Using projection for WMS:", targetProjection);

  const source = new TileWMS({
    url: layerInfo.serviceUrl,
    params: {
      LAYERS: layerInfo.name,
      VERSION: "1.1.1", // Use 1.1.1 for better compatibility with older services
      FORMAT: "image/png",
      TRANSPARENT: true,
      SRS: targetProjection, // Use the target projection
    },
    crossOrigin: "anonymous",
    transition: 0, // Disable transition for faster loading
  });

  const layer = new TileLayer({
    name: `external_wms_${layerInfo.name}`,
    caption: layerInfo.title || layerInfo.name,
    visible: true,
    opacity: 1,
    source: source,
    layerType: "layer", // Mark as regular layer for LayerSwitcher
    zIndex: 1000, // Set initial high z-index
  });

  // Store additional metadata that HAJK expects
  layer.set("isExternalLayer", true);
  layer.set("serviceType", "WMS");
  layer.set("originalLayerInfo", layerInfo);
  layer.set("queryable", false); // Prevent info click errors
  layer.set("id", `external_wms_${layerInfo.name}`); // Add unique ID
  layer.set("drawOrder", 1000); // Set draw order for LayerSwitcher

  // Add LayerSwitcher compatibility properties to prevent errors
  layer.set("quickAccess", false); // Prevent quick access errors
  layer.set("infobox", ""); // Prevent infobox errors
  layer.set("visibleAtStart", true); // Set visibility flag
  layer.set("legend", ""); // Prevent legend errors
  layer.set("legendIcon", ""); // Prevent legend icon errors

  // Create a proper layerInfo object that matches HAJK's expectations
  const hajkLayerInfo = {
    id: `external_wms_${layerInfo.name}`,
    caption: layerInfo.title || layerInfo.name,
    visible: true,
    layerType: "layer",
    drawOrder: 1000,
    visibleAtStart: true,
    infobox: "",
    legend: "",
    legendIcon: "",
    queryable: false,
    searchable: false,
    filterable: false
  };

  layer.set("layerInfo", hajkLayerInfo);

  // Also set these properties directly on the layer for compatibility
  layer.set("searchable", false);
  layer.set("filterable", false);
  layer.set("legend", "");
  layer.set("legendIcon", "");

  // Add error handling
  source.on('tileloaderror', (event) => {
    console.error('WMS tile load error:', event);
  });

  source.on('tileloadend', (event) => {
    console.log('WMS tile loaded successfully');
  });

  return layer;
}

/**
 * Create a WMTS tile layer
 * @param {Object} layerInfo - WMTS layer information
 * @param {string} capabilitiesUrl - Capabilities URL
 * @param {ol.Map} map - OpenLayers map instance
 * @returns {ol.layer.Tile} WMTS tile layer
 */
function createWMTSLayer(layerInfo, capabilitiesUrl, map) {
  console.log("Creating WMTS layer:", layerInfo);

  const layer = layerInfo.layer; // Full layer object from capabilities

  // Get the configured values from the layer configuration
  const configuredFormat = layerInfo.configuredFormat || layer.Format?.[0] || "image/png";
  const configuredStyle = layerInfo.configuredStyles || layer.Style?.[0]?.Identifier || "default";

  // Get the first available tile matrix set
  const tileMatrixSetLink = layer.TileMatrixSetLink?.[0];
  if (!tileMatrixSetLink) {
    throw new Error(`No tile matrix set found for layer ${layer.Identifier}`);
  }

  const matrixSet = tileMatrixSetLink.TileMatrixSet;
  console.log("Using tile matrix set:", matrixSet);

  // Try to create WMTS source using capabilities-based approach first
  let source;

  try {
    // Method 1: Use OpenLayers' capabilities-based approach (recommended)
    source = createWMTSSourceFromCapabilities(layerInfo, configuredFormat, configuredStyle, matrixSet);
  } catch (error) {
    console.warn(
      "Failed to create WMTS source from capabilities, trying KVP approach:",
      error
    );
    // Method 2: Fallback to KVP (Key-Value-Pair) approach
    source = createWMTSSourceKVP(layer, layerInfo.serviceUrl, configuredFormat, configuredStyle, matrixSet);
  }

  const tileLayer = new TileLayer({
    name: `external_wmts_${layer.Identifier}`,
    caption: layer.Title || layer.Identifier,
    visible: true,
    opacity: 1,
    source: source,
    layerType: "layer", // Mark as regular layer for LayerSwitcher
  });

  // Store additional metadata that HAJK expects
  tileLayer.set("isExternalLayer", true);
  tileLayer.set("serviceType", "WMTS");
  tileLayer.set("originalLayerInfo", layerInfo);
  tileLayer.set("queryable", false); // Prevent info click errors
  tileLayer.set("id", `external_wmts_${layer.Identifier}`); // Add unique ID
  tileLayer.set("drawOrder", 1000); // Set draw order for LayerSwitcher

  // Add LayerSwitcher compatibility properties to prevent errors
  tileLayer.set("quickAccess", false); // Prevent quick access errors
  tileLayer.set("infobox", ""); // Prevent infobox errors
  tileLayer.set("visibleAtStart", true); // Set visibility flag
  tileLayer.set("legend", ""); // Prevent legend errors
  tileLayer.set("legendIcon", ""); // Prevent legend icon errors

  // Create a proper layerInfo object that matches HAJK's expectations
  const hajkLayerInfo = {
    id: `external_wmts_${layer.Identifier}`,
    caption: layer.Title || layer.Identifier,
    visible: true,
    layerType: "layer",
    drawOrder: 1000,
    visibleAtStart: true,
    infobox: "",
    legend: "",
    legendIcon: "",
    queryable: false,
    searchable: false,
    filterable: false
  };

  tileLayer.set("layerInfo", hajkLayerInfo);

  // Also set these properties directly on the layer for compatibility
  tileLayer.set("searchable", false);
  tileLayer.set("filterable", false);
  tileLayer.set("legend", "");
  tileLayer.set("legendIcon", "");

  return tileLayer;
}

/**
 * Create WMTS source using capabilities-based approach
 * @param {Object} layerInfo - Full layer info including capabilities
 * @param {string} configuredFormat - Configured format
 * @param {string} configuredStyle - Configured style
 * @param {string} matrixSet - Tile matrix set name
 * @returns {ol.source.WMTS} WMTS source
 */
function createWMTSSourceFromCapabilities(layerInfo, configuredFormat, configuredStyle, matrixSet) {
  const capabilities = layerInfo.capabilities;
  const layer = layerInfo.layer;

  console.log("Creating WMTS from capabilities:", {
    layerIdentifier: layer.Identifier,
    matrixSet: matrixSet,
    format: configuredFormat,
    style: configuredStyle,
    availableMatrixSets: capabilities?.Contents?.TileMatrixSet?.map(tms => tms.Identifier),
    hasCapabilities: !!capabilities,
    hasContents: !!capabilities?.Contents,
    hasTileMatrixSet: !!capabilities?.Contents?.TileMatrixSet
  });

  // Validate that we have the necessary capabilities
  if (!capabilities || !capabilities.Contents || !capabilities.Contents.TileMatrixSet) {
    throw new Error(`Missing tile matrix set definitions in capabilities for layer ${layer.Identifier}`);
  }

  // Check if the requested matrix set exists
  const availableMatrixSets = capabilities.Contents.TileMatrixSet.map(tms => tms.Identifier);
  if (!availableMatrixSets.includes(matrixSet)) {
    console.warn(`Requested matrix set ${matrixSet} not found. Available: ${availableMatrixSets.join(', ')}`);
    // Use the first available matrix set as fallback
    matrixSet = availableMatrixSets[0];
    console.log(`Using fallback matrix set: ${matrixSet}`);
  }

  // Try different matrix sets if the requested one doesn't work
  let options = null;
  let workingMatrixSet = matrixSet;

  // Try the requested matrix set first
  try {
    console.log(`Trying optionsFromCapabilities with matrix set: ${workingMatrixSet}`);
    options = WMTS.optionsFromCapabilities(capabilities, {
      layer: layer.Identifier,
      matrixSet: workingMatrixSet,
      format: configuredFormat,
      style: configuredStyle,
    });
  } catch (error) {
    console.warn(`optionsFromCapabilities failed with ${workingMatrixSet}:`, error);
    options = null;
  }

  // If that failed, try each available matrix set
  if (!options) {
    for (const availableMatrixSet of availableMatrixSets) {
      try {
        console.log(`Trying fallback matrix set: ${availableMatrixSet}`);
        options = WMTS.optionsFromCapabilities(capabilities, {
          layer: layer.Identifier,
          matrixSet: availableMatrixSet,
          format: configuredFormat,
          style: configuredStyle,
        });
        if (options) {
          workingMatrixSet = availableMatrixSet;
          console.log(`Successfully created options with matrix set: ${workingMatrixSet}`);
          break;
        }
      } catch (error) {
        console.warn(`Matrix set ${availableMatrixSet} also failed:`, error);
      }
    }
  }

  if (!options) {
    console.error(`All matrix sets failed for layer ${layer.Identifier}. Available: ${availableMatrixSets.join(', ')}`);
    throw new Error(`Failed to create WMTS options for layer ${layer.Identifier}. Tried matrix sets: ${availableMatrixSets.join(', ')}`);
  }

  console.log("WMTS options created successfully:", {
    url: options.url,
    layer: options.layer,
    matrixSet: options.matrixSet,
    format: options.format,
    style: options.style,
    projection: options.projection?.getCode(),
    tileGrid: options.tileGrid ? {
      matrixIds: options.tileGrid.getMatrixIds(),
      resolutions: options.tileGrid.getResolutions()
    } : null
  });

  // Create a custom tileUrlFunction that handles getMatrixId errors
  const customTileUrlFunction = function (tileCoord, pixelRatio, projection) {
    try {
      console.log("Custom tileUrlFunction called with:", { tileCoord, pixelRatio, projection: projection?.getCode() });

      const tileGrid = this.getTileGrid();
      const z = tileCoord[0];
      const x = tileCoord[1];
      const y = tileCoord[2];

      console.log("Tile coordinates:", { z, x, y });

      // Get matrix ID safely
      let matrixId;
      try {
        matrixId = tileGrid.getMatrixId(z);
        console.log(`Successfully got matrix ID for zoom ${z}:`, matrixId);
      } catch (error) {
        console.warn(`Failed to get matrix ID for zoom ${z}, using zoom as matrix ID:`, error);
        matrixId = z.toString();
      }

      // Construct URL based on the service type
      let finalUrl;
      if (options.url && options.url.includes('{')) {
        // Template URL
        finalUrl = options.url
          .replace('{TileMatrix}', matrixId)
          .replace('{TileRow}', y.toString())
          .replace('{TileCol}', x.toString());
      } else {
        // KVP URL
        const url = new URL(options.url);
        url.searchParams.set('TILEMATRIX', matrixId);
        url.searchParams.set('TILEROW', y.toString());
        url.searchParams.set('TILECOL', x.toString());
        finalUrl = url.toString();
      }

      console.log("Generated tile URL:", finalUrl);
      return finalUrl;
    } catch (error) {
      console.error('Error in custom tileUrlFunction:', error);
      // Return a placeholder URL to prevent complete failure
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  };

  // Create WMTS source with error handling and validation
  console.log("Creating WMTS source with options:", {
    hasUrl: !!options.url,
    hasLayer: !!options.layer,
    hasMatrixSet: !!options.matrixSet,
    hasFormat: !!options.format,
    hasStyle: !!options.style,
    hasTileGrid: !!options.tileGrid,
    hasTileUrlFunction: !!options.tileUrlFunction
  });

  const wmtsSource = new WMTS({
    ...options,
    crossOrigin: "anonymous",
    tileUrlFunction: customTileUrlFunction, // Override with our custom function
  });

  console.log("WMTS source created, checking if it has a working tileUrlFunction...");

  // Test the tileUrlFunction immediately
  try {
    const testTileCoord = [0, 0, 0]; // zoom 0, x=0, y=0
    const testUrl = wmtsSource.tileUrlFunction(testTileCoord, 1, wmtsSource.getProjection());
    console.log("Test tile URL generated successfully:", testUrl);
  } catch (error) {
    console.error("tileUrlFunction test failed:", error);

    // If the built-in tileUrlFunction fails, override it with our custom one
    console.log("Overriding tileUrlFunction with custom implementation...");
    wmtsSource.tileUrlFunction = function (tileCoord, pixelRatio, projection) {
      try {
        console.log("Custom tileUrlFunction called with:", { tileCoord, pixelRatio, projection: projection?.getCode() });

        const tileGrid = this.getTileGrid();
        const z = tileCoord[0];
        const x = tileCoord[1];
        const y = tileCoord[2];

        console.log("Tile coordinates:", { z, x, y });

        // Get matrix ID safely
        let matrixId;
        try {
          matrixId = tileGrid.getMatrixId(z);
          console.log(`Successfully got matrix ID for zoom ${z}:`, matrixId);
        } catch (error) {
          console.warn(`Failed to get matrix ID for zoom ${z}, using zoom as matrix ID:`, error);
          matrixId = z.toString();
        }

        // Construct URL based on the service type
        let finalUrl;
        if (options.url && options.url.includes('{')) {
          // Template URL
          finalUrl = options.url
            .replace('{TileMatrix}', matrixId)
            .replace('{TileRow}', y.toString())
            .replace('{TileCol}', x.toString());
        } else {
          // KVP URL
          const url = new URL(options.url);
          url.searchParams.set('TILEMATRIX', matrixId);
          url.searchParams.set('TILEROW', y.toString());
          url.searchParams.set('TILECOL', x.toString());
          finalUrl = url.toString();
        }

        console.log("Generated tile URL:", finalUrl);
        return finalUrl;
      } catch (error) {
        console.error('Error in custom tileUrlFunction:', error);
        // Return a placeholder URL to prevent complete failure
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      }
    };

    // Test the custom function
    try {
      const testUrl2 = wmtsSource.tileUrlFunction([0, 0, 0], 1, wmtsSource.getProjection());
      console.log("Custom tileUrlFunction test successful:", testUrl2);
    } catch (error2) {
      console.error("Custom tileUrlFunction also failed:", error2);
    }
  }

  // Validate the tile grid configuration
  const tileGrid = wmtsSource.getTileGrid();
  if (tileGrid) {
    console.log("WMTS tile grid validation:", {
      matrixIds: tileGrid.getMatrixIds(),
      resolutions: tileGrid.getResolutions(),
      origins: tileGrid.getOrigins ? tileGrid.getOrigins() : 'not available',
      tileSizes: tileGrid.getTileSizes ? tileGrid.getTileSizes() : 'not available'
    });

    // Test if we can get a matrix ID for zoom level 0
    try {
      const testMatrixId = tileGrid.getMatrixId(0);
      console.log("Test matrix ID for zoom 0:", testMatrixId);
    } catch (error) {
      console.error("Failed to get matrix ID for zoom 0:", error);
    }
  } else {
    console.error("No tile grid found in WMTS source!");
  }

  // Add error handling for tile loading
  wmtsSource.on('tileloaderror', (event) => {
    console.error('WMTS tile load error:', {
      tile: event.tile,
      url: event.tile.src_,
      error: event
    });
  });

  wmtsSource.on('tileloadstart', (event) => {
    console.log('WMTS tile load started:', event.tile.src_);
  });

  wmtsSource.on('tileloadend', (event) => {
    console.log('WMTS tile loaded successfully:', event.tile.src_);
  });

  return wmtsSource;
}

/**
 * Create WMTS source using KVP (Key-Value-Pair) approach
 * @param {Object} layer - WMTS layer from capabilities
 * @param {string} serviceUrl - Base service URL
 * @param {string} configuredFormat - Configured format
 * @param {string} configuredStyle - Configured style
 * @param {string} matrixSet - Tile matrix set name
 * @returns {ol.source.WMTS} WMTS source
 */
function createWMTSSourceKVP(layer, serviceUrl, configuredFormat, configuredStyle, matrixSet) {
  // Build KVP URL
  const url = new URL(serviceUrl);
  url.searchParams.set("SERVICE", "WMTS");
  url.searchParams.set("REQUEST", "GetTile");
  url.searchParams.set("VERSION", "1.0.0");
  url.searchParams.set("LAYER", layer.Identifier);
  url.searchParams.set("STYLE", configuredStyle);
  url.searchParams.set("TILEMATRIXSET", matrixSet);
  url.searchParams.set("FORMAT", configuredFormat);
  url.searchParams.set("TILEMATRIX", "{TileMatrix}");
  url.searchParams.set("TILEROW", "{TileRow}");
  url.searchParams.set("TILECOL", "{TileCol}");

  return new WMTS({
    url: url.toString(),
    layer: layer.Identifier,
    matrixSet: matrixSet,
    format: configuredFormat,
    style: configuredStyle,
    crossOrigin: "anonymous",
  });
}
