import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import WMTS from "ol/source/WMTS";

/**
 * Add a WMS or WMTS layer to the OpenLayers map
 * @param {ol.Map} map - OpenLayers map instance
 * @param {Object} layerInfo - Layer information from capabilities
 * @param {string} serviceType - "WMS" or "WMTS"
 * @param {string} capabilitiesUrl - Original capabilities URL
 */
export function addLayerToMap(map, layerInfo, serviceType, capabilitiesUrl) {
  try {
    let layer;

    if (serviceType === "WMS") {
      layer = createWMSLayer(layerInfo, capabilitiesUrl);
    } else if (serviceType === "WMTS") {
      layer = createWMTSLayer(layerInfo, capabilitiesUrl);
    } else {
      throw new Error(`Unsupported service type: ${serviceType}`);
    }

    // Add layer to map
    map.addLayer(layer);

    // Set a high z-index to ensure it appears on top
    layer.setZIndex(1000 + map.getLayers().getLength());

    console.log(
      `Added ${serviceType} layer: ${layerInfo.title || layerInfo.name}`
    );
  } catch (error) {
    console.error("Error adding layer to map:", error);
    throw error;
  }
}

/**
 * Create a WMS tile layer
 * @param {Object} layerInfo - WMS layer information
 * @param {string} capabilitiesUrl - Capabilities URL
 * @returns {ol.layer.Tile} WMS tile layer
 */
function createWMSLayer(layerInfo, capabilitiesUrl) {
  const source = new TileWMS({
    url: layerInfo.serviceUrl,
    params: {
      LAYERS: layerInfo.name,
      TILED: true,
      VERSION: "1.1.1",
      FORMAT: "image/png",
      TRANSPARENT: true,
    },
    serverType: "geoserver", // Default to geoserver, could be made configurable
    crossOrigin: "anonymous",
  });

  const layer = new TileLayer({
    name: `external_wms_${layerInfo.name}`,
    caption: layerInfo.title || layerInfo.name,
    visible: true,
    opacity: 1,
    source: source,
    layerType: "layer", // Mark as regular layer for LayerSwitcher
  });

  // Store additional metadata
  layer.set("isExternalLayer", true);
  layer.set("serviceType", "WMS");
  layer.set("originalLayerInfo", layerInfo);

  return layer;
}

/**
 * Create a WMTS tile layer
 * @param {Object} layerInfo - WMTS layer information
 * @param {string} capabilitiesUrl - Capabilities URL
 * @returns {ol.layer.Tile} WMTS tile layer
 */
function createWMTSLayer(layerInfo, capabilitiesUrl) {
  const layer = layerInfo.layer; // Full layer object from capabilities

  // Try to create WMTS source using different approaches
  let source;

  try {
    // Method 1: Try using resource URL template if available
    if (layer.ResourceURL && layer.ResourceURL.length > 0) {
      source = createWMTSSourceFromTemplate(layer, layerInfo.serviceUrl);
    } else {
      // Method 2: Fallback to KVP (Key-Value-Pair) approach
      source = createWMTSSourceKVP(layer, layerInfo.serviceUrl);
    }
  } catch (error) {
    console.warn(
      "Failed to create WMTS source with template, trying KVP approach:",
      error
    );
    source = createWMTSSourceKVP(layer, layerInfo.serviceUrl);
  }

  const tileLayer = new TileLayer({
    name: `external_wmts_${layer.Identifier}`,
    caption: layer.Title || layer.Identifier,
    visible: true,
    opacity: 1,
    source: source,
    layerType: "layer", // Mark as regular layer for LayerSwitcher
  });

  // Store additional metadata
  tileLayer.set("isExternalLayer", true);
  tileLayer.set("serviceType", "WMTS");
  tileLayer.set("originalLayerInfo", layerInfo);

  return tileLayer;
}

/**
 * Create WMTS source using URL template
 * @param {Object} layer - WMTS layer from capabilities
 * @param {string} serviceUrl - Base service URL
 * @returns {ol.source.WMTS} WMTS source
 */
function createWMTSSourceFromTemplate(layer, serviceUrl) {
  const resourceUrl = layer.ResourceURL[0];
  let urlTemplate = resourceUrl.template;

  // Replace WMTS URL template variables
  urlTemplate = urlTemplate.replace("{Layer}", layer.Identifier);
  urlTemplate = urlTemplate.replace(
    "{Style}",
    layer.Style[0]?.Identifier || "default"
  );
  urlTemplate = urlTemplate.replace(
    "{TileMatrixSet}",
    layer.TileMatrixSetLink[0]?.TileMatrixSet || ""
  );

  return new WMTS({
    url: urlTemplate,
    layer: layer.Identifier,
    matrixSet: layer.TileMatrixSetLink[0]?.TileMatrixSet || "",
    format: layer.Format[0] || "image/png",
    style: layer.Style[0]?.Identifier || "default",
    crossOrigin: "anonymous",
  });
}

/**
 * Create WMTS source using KVP (Key-Value-Pair) approach
 * @param {Object} layer - WMTS layer from capabilities
 * @param {string} serviceUrl - Base service URL
 * @returns {ol.source.WMTS} WMTS source
 */
function createWMTSSourceKVP(layer, serviceUrl) {
  // Build KVP URL
  const url = new URL(serviceUrl);
  url.searchParams.set("SERVICE", "WMTS");
  url.searchParams.set("REQUEST", "GetTile");
  url.searchParams.set("VERSION", "1.0.0");
  url.searchParams.set("LAYER", layer.Identifier);
  url.searchParams.set("STYLE", layer.Style[0]?.Identifier || "default");
  url.searchParams.set(
    "TILEMATRIXSET",
    layer.TileMatrixSetLink[0]?.TileMatrixSet || ""
  );
  url.searchParams.set("FORMAT", layer.Format[0] || "image/png");
  url.searchParams.set("TILEMATRIX", "{TileMatrix}");
  url.searchParams.set("TILEROW", "{TileRow}");
  url.searchParams.set("TILECOL", "{TileCol}");

  return new WMTS({
    url: url.toString(),
    layer: layer.Identifier,
    matrixSet: layer.TileMatrixSetLink[0]?.TileMatrixSet || "",
    format: layer.Format[0] || "image/png",
    style: layer.Style[0]?.Identifier || "default",
    crossOrigin: "anonymous",
  });
}
