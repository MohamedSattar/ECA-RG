import * as React from "react";
import { Spinner, SpinnerSize } from "@fluentui/react/lib/Spinner";
import { mergeStyles } from "@fluentui/react/lib/Styling";

export interface LoaderProps {
  isVisible: boolean;
  label?: string;
  size?: SpinnerSize;
  backgroundColor?: string;
  opacity?: number;
}

const overlayClass = (backgroundColor: string, opacity: number) =>
  mergeStyles({
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: backgroundColor,
    opacity: opacity,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2147483647, // Maximum z-index value to ensure it's above everything
    flexDirection: "column",
  });

const spinnerContainerClass = mergeStyles({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  position: "relative",
  zIndex: 2147483647, // Maximum z-index value
});

const labelClass = mergeStyles({
  color: "#323130",
  fontSize: "14px",
  fontWeight: 400,
  marginTop: "12px",
});

export const Loader: React.FC<LoaderProps> = ({
  isVisible,
  label = "Loading...",
  size = SpinnerSize.large,
  backgroundColor = "#ffffff",
  opacity = 0.8,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className={overlayClass(backgroundColor, opacity)}>
      <div className={spinnerContainerClass}>
        <Spinner size={size} label={label} labelPosition="bottom" />
      </div>
    </div>
  );
};

// Full screen transparent loader variant
export interface FullScreenLoaderProps {
  isVisible: boolean;
  label?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  isVisible,
  label = "Loading...",
}) => {
  return (
    <Loader
      isVisible={isVisible}
      label={label}
      size={SpinnerSize.large}
      backgroundColor="rgba(255, 255, 255, 0.8)"
      opacity={1}
    />
  );
};

// Inline loader for components
export interface InlineLoaderProps {
  isVisible: boolean;
  label?: string;
  size?: SpinnerSize;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  isVisible,
  label,
  size = SpinnerSize.medium,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <Spinner size={size} label={label} />
    </div>
  );
};

// Overlay loader with backdrop
export interface OverlayLoaderProps {
  isVisible: boolean;
  label?: string;
  size?: SpinnerSize;
}

export const OverlayLoader: React.FC<OverlayLoaderProps> = ({
  isVisible,
  label = "Processing...",
  size = SpinnerSize.large,
}) => {
  return (
    <Loader
      isVisible={isVisible}
      label={label}
      size={size}
      backgroundColor="rgba(0, 0, 0, 0.5)"
      opacity={1}
    />
  );
};
