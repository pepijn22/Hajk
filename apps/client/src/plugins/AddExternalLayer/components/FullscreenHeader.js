import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material";

/**
 * Fullscreen Header Component
 * Handles the plugin header with title and fullscreen toggle
 */
export function FullscreenHeader({ 
  title, 
  isFullscreen, 
  onFullscreenToggle 
}) {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      mb: 2 
    }}>
      <Typography variant="h6">
        {title}
      </Typography>
      <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
        <IconButton 
          onClick={onFullscreenToggle}
          color="primary"
          size="small"
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}