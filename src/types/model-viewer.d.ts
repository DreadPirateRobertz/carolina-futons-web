import "react";

type ModelViewerAttributes = React.HTMLAttributes<HTMLElement> & {
  src?: string;
  alt?: string;
  ar?: boolean | "" | undefined;
  "ar-modes"?: string;
  "camera-controls"?: boolean | "" | undefined;
  "auto-rotate"?: boolean | "" | undefined;
  slot?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLElement>;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}
