import WMSCapabilities from "ol/format/WMSCapabilities";
import WMTSCapabilities from "ol/format/WMTSCapabilities";

/**
 * Parse WMS or WMTS GetCapabilities XML and extract layer information
 * @param {string} url - GetCapabilities URL
 * @param {string} serviceType - "WMS" or "WMTS"
 * @returns {Promise<Array>} Array of layer objects
 */
export async function parseCapabilities(url, serviceType) {
  try {
    // Ensure URL has proper GetCapabilities parameters
    const capabilitiesUrl = ensureGetCapabilitiesUrl(url, serviceType);

    // Fetch the capabilities XML
    const response = await fetch(capabilitiesUrl, {
      method: "GET",
      headers: {
        Accept: "application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    const xmlText = await response.text();

    // Check if response is actually XML
    if (
      !xmlText.trim().startsWith("<?xml") &&
      !xmlText.trim().startsWith("<")
    ) {
      throw new Error("Response is not valid XML");
    }

    if (serviceType === "WMS") {
      return parseWMSCapabilities(xmlText, capabilitiesUrl);
    } else if (serviceType === "WMTS") {
      return parseWMTSCapabilities(xmlText, capabilitiesUrl);
    } else {
      throw new Error(`Unsupported service type: ${serviceType}`);
    }
  } catch (error) {
    console.error("Error parsing capabilities:", error);

    // Provide more specific error messages
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to fetch capabilities. This might be due to CORS restrictions or the server being unavailable.`
      );
    }

    throw new Error(
      `Failed to parse ${serviceType} capabilities: ${error.message}`
    );
  }
}

/**
 * Ensure the URL has proper GetCapabilities parameters
 * @param {string} url - Original URL
 * @param {string} serviceType - "WMS" or "WMTS"
 * @returns {string} URL with GetCapabilities parameters
 */
function ensureGetCapabilitiesUrl(url, serviceType) {
  try {
    const urlObj = new URL(url);

    // Set required parameters for GetCapabilities
    urlObj.searchParams.set("SERVICE", serviceType);
    urlObj.searchParams.set("REQUEST", "GetCapabilities");

    if (serviceType === "WMS" && !urlObj.searchParams.has("VERSION")) {
      urlObj.searchParams.set("VERSION", "1.3.0");
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn("Failed to parse URL, using original:", error);
    return url;
  }
}

/**
 * Parse WMS GetCapabilities XML
 * @param {string} xmlText - XML content
 * @param {string} baseUrl - Base URL for the service
 * @returns {Array} Array of WMS layer objects
 */
function parseWMSCapabilities(xmlText, baseUrl) {
  const parser = new WMSCapabilities();
  const capabilities = parser.read(xmlText);

  if (
    !capabilities ||
    !capabilities.Capability ||
    !capabilities.Capability.Layer
  ) {
    throw new Error("Invalid WMS capabilities document");
  }

  const layers = [];

  // Extract layers recursively
  function extractLayers(layer, parentCRS = []) {
    if (layer.Layer && layer.Layer.length > 0) {
      // This is a layer group, process children
      layer.Layer.forEach((childLayer) => {
        const inheritedCRS = [...parentCRS, ...(layer.CRS || [])];
        extractLayers(childLayer, inheritedCRS);
      });
    } else if (layer.Name) {
      // This is a leaf layer
      const crs = [...parentCRS, ...(layer.CRS || [])];
      layers.push({
        name: layer.Name,
        title: layer.Title || layer.Name,
        abstract: layer.Abstract || "",
        crs: crs,
        bbox: layer.BoundingBox || layer.EX_GeographicBoundingBox,
        queryable: layer.queryable || false,
        styles: layer.Style || [],
        serviceUrl: baseUrl.split("?")[0], // Remove query parameters
        serviceType: "WMS",
      });
    }
  }

  extractLayers(capabilities.Capability.Layer);

  return layers;
}

/**
 * Parse WMTS GetCapabilities XML
 * @param {string} xmlText - XML content
 * @param {string} baseUrl - Base URL for the service
 * @returns {Array} Array of WMTS layer objects
 */
function parseWMTSCapabilities(xmlText, baseUrl) {
  const parser = new WMTSCapabilities();
  const capabilities = parser.read(xmlText);

  if (!capabilities || !capabilities.Contents || !capabilities.Contents.Layer) {
    throw new Error("Invalid WMTS capabilities document");
  }

  const layers = capabilities.Contents.Layer.map((layer) => ({
    name: layer.Identifier,
    title: layer.Title || layer.Identifier,
    abstract: layer.Abstract || "",
    formats: layer.Format || [],
    tileMatrixSets:
      layer.TileMatrixSetLink?.map((link) => link.TileMatrixSet) || [],
    styles: layer.Style || [],
    resourceUrls: layer.ResourceURL || [],
    serviceUrl: baseUrl.split("?")[0], // Remove query parameters
    serviceType: "WMTS",
    layer: layer, // Store the full layer object for later use
  }));

  return layers;
}
