"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

type TooltipPosition = {
  top: number;
  left: number;
  placement: "above" | "below";
};

type UiTooltipProps = {
  label: string;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
};

type TriggerRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 10;

export default function UiTooltip({ label, children }: UiTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, placement: "above" });
  const [triggerRect, setTriggerRect] = useState<TriggerRect | null>(null);
  const tooltipId = useId();
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  if (!isValidElement(children)) {
    return children;
  }

  const updatePosition = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    const rect = target.getBoundingClientRect();
    setTriggerRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  };

  const showTooltip = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    updatePosition(event.currentTarget);
    setVisible(true);
  };

  const hideTooltip = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || !triggerRect || !tooltipRef.current || typeof window === "undefined") return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const centeredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
    const left = Math.min(Math.max(centeredLeft, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxLeft));
    const shouldPlaceBelow = triggerRect.top < tooltipRect.height + VIEWPORT_MARGIN + TOOLTIP_GAP;
    const top = shouldPlaceBelow
      ? triggerRect.top + triggerRect.height + TOOLTIP_GAP
      : triggerRect.top - tooltipRect.height - TOOLTIP_GAP;

    setPosition({
      top,
      left,
      placement: shouldPlaceBelow ? "below" : "above",
    });
  }, [visible, triggerRect, label]);

  const childProps = children.props;

  const wrappedChild = cloneElement(children, {
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      showTooltip(event);
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      hideTooltip();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      showTooltip(event);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      hideTooltip();
    },
    "aria-describedby": visible ? tooltipId : childProps["aria-describedby"],
  });

  return (
    <>
      {wrappedChild}
      {visible && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="workspace-tooltip fixed z-[220]"
              style={{ top: position.top, left: position.left }}
            >
              {label}
              <span
                aria-hidden
                className={position.placement === "below" ? "workspace-tooltip-arrow-top" : "workspace-tooltip-arrow"}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
