import { cloneElement, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement } from "react";
import { cn } from "./cn";

export function Button({
  variant = "outline",
  size = "default",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "outline" | "secondary" | "destructive";
  size?: "default" | "icon-sm";
}) {
  return (
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
  children: ReactElement<{ title?: string }>;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return cloneElement(children, { title: children.props.title ?? title });
}
