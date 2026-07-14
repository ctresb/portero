import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-[background-color,color,transform,opacity] duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap active:scale-[0.94]",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:opacity-85",
        outline: "border border-border bg-transparent hover:bg-accent",
        ghost: "hover:bg-accent",
        danger: "bg-danger-soft text-danger hover:bg-danger hover:text-background",
      },
      size: {
        sm: "h-7 px-2.5",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "outline", size: "sm" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-7 w-full rounded-md border border-border bg-transparent px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-2 cursor-text select-text",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Badge({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}
