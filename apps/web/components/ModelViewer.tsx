"use client";

import { useEffect, useRef } from "react";

interface ModelViewerProps {
  src: string;
  alt?: string;
  className?: string;
  ar?: boolean;
  autoRotate?: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean | string;
          "auto-rotate"?: boolean | string;
          "camera-controls"?: boolean | string;
          "ar-modes"?: string;
          "shadow-intensity"?: string;
          exposure?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

export function ModelViewer({
  src,
  alt = "3D Model",
  className,
  ar = true,
  autoRotate = true,
}: ModelViewerProps): JSX.Element {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
    document.head.appendChild(script);
  }, []);

  return (
    <model-viewer
      src={src}
      alt={alt}
      ar={ar || undefined}
      auto-rotate={autoRotate || undefined}
      camera-controls
      ar-modes="webxr scene-viewer quick-look"
      shadow-intensity="1"
      exposure="0.8"
      style={{
        width: "100%",
        height: "300px",
        borderRadius: "12px",
        background: "#1a1a2e",
      }}
      className={className}
    />
  );
}
