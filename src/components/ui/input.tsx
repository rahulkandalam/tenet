import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("onyx-field h-11 w-full px-3.5 text-sm text-ink placeholder:text-ink-muted", className)}
      {...props}
    />
  );
}

export { Input };
