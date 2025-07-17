import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";
import AddExternalLayerView from "./AddExternalLayerView";
import Observer from "react-event-observer";
import LayersIcon from "@mui/icons-material/Layers";

/**
 * @summary Main component for the AddExternalLayer plugin.
 * @description Allows users to dynamically add WMS or WMTS layers to the map at runtime.
 */
function AddExternalLayer(props) {
  const [localObserver] = React.useState(Observer());

  const onWindowHide = () => {
    // Plugin window hidden
  };

  const onWindowShow = () => {
    // Plugin window shown
  };

  return (
    <BaseWindowPlugin
      {...props}
      type="AddExternalLayer"
      custom={{
        icon: <LayersIcon />,
        title: "Add External Layer",
        description: "Add WMS or WMTS layers to the map",
        height: "dynamic",
        width: 500,
        onWindowHide: onWindowHide,
        onWindowShow: onWindowShow,
      }}
    >
      <AddExternalLayerView
        app={props.app}
        map={props.map}
        localObserver={localObserver}
        globalObserver={props.app.globalObserver}
      />
    </BaseWindowPlugin>
  );
}

export default AddExternalLayer;
