import { cloneElement, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export function Tip({ label, children }: { label: string; children: ReactElement<HTMLAttributes<HTMLElement>> }) {
  const [box, setBox] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const timer = useRef<number | null>(null);

  function show(target: HTMLElement) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const above = rect.bottom + 36 > window.innerHeight;
      setBox({ x: rect.left + rect.width / 2, y: above ? rect.top - 8 : rect.bottom + 8, above });
    }, 250);
  }

  function hide() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setBox(null);
  }

  return (
    <>
      {cloneElement(children, {
        onMouseEnter: (event) => {
          children.props.onMouseEnter?.(event);
          show(event.currentTarget);
        },
        onMouseLeave: (event) => {
          children.props.onMouseLeave?.(event);
          hide();
        },
        onFocus: (event) => {
          children.props.onFocus?.(event);
          show(event.currentTarget);
        },
        onBlur: (event) => {
          children.props.onBlur?.(event);
          hide();
        },
      })}
      {box
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[80] rounded-md bg-[#202124] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-md"
              style={{ left: box.x, top: box.y, transform: box.above ? "translate(-50%, -100%)" : "translate(-50%, 0)" }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

export function Button({
  variant = "outline",
  size = "default",
  className,
  type = "button",
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "outline" | "secondary" | "destructive";
  size?: "default" | "icon-sm";
}) {
  const button = (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[#1b4f9c]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        variant === "ghost" && "hover:bg-[#e8eaed]",
        variant === "outline" && "border-[#d0d7de] bg-white hover:bg-[#e8eaed]",
        variant === "secondary" && "bg-[#e8eaed] hover:bg-[#dde0e4]",
        variant === "destructive" && "bg-[#c5221f]/10 text-[#c5221f] hover:bg-[#c5221f]/20",
        size === "default" && "h-8 gap-1.5 px-2.5",
        size === "icon-sm" && "size-7",
        className,
      )}
      {...props}
    />
  );
  if (!title) return button;
  return <Tip label={title}>{button}</Tip>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-[#d0d7de] bg-transparent px-2.5 text-sm text-[#202124] outline-none placeholder:text-[#5f6368] focus-visible:border-[#1b4f9c] focus-visible:ring-3 focus-visible:ring-[#1b4f9c]/30",
        className,
      )}
      {...props}
    />
  );
}

export function Hint({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
}) {
  return <Tip label={shortcut ? `${label} (${shortcut})` : label}>{children}</Tip>;
}
