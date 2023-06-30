import React from "react";
import { Button } from "@mui/material";

const ShowHideLayersComponent = (props) => {
  console.log("props: ", props);
  // Let's prepare the needed parts by parsing our template string
  const templateArray = props.templateString.split(",");
  const layersAttribute = templateArray[0];
  const subLayersAttribute = templateArray[1];
  const showLabel = templateArray[2];
  const hideLabel = templateArray[3];

  // Let's grab the actual IDs of layers and sublayers
  // that we want to print Show/Hide buttons for. We'll get
  // that info from the featureAttributes object and we can split its
  // string value to end up with an array
  const layers = props.featureAttributes[layersAttribute]?.split(",");
  const subLayers = props.featureAttributes[subLayersAttribute]?.split(",");

  // TODO:
  // Add: ability to look up layers (could be by exposing this.app or this.map)
  // Add: globalObserver to call show or hide layer. Another option is to
  // directly modify the hash part (l and gl params) and allow that mechanism
  // to take care of actual toggling.

  // Next, when that's done, theres more TODO:
  // Loop layers, that contains IDs.
  // For each, check if there's a corresponding property
  // inside subLayers and if so, grab the list of sub layers.
  // Grab corresponding "caption" so we have something nice to print
  // except for the ID.
  return (
    <>
      <Button>{showLabel}</Button>
    </>
  );
};

export default ShowHideLayersComponent;
