import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, generateAvatarColor, getInitials } from "../../lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-6 w-6",
        default: "h-8 w-8",
        lg: "h-10 w-10",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  user?: {
    name: string;
    avatar?: string;
    id?: string;
  };
  name?: string;
  src?: string;
  fallback?: string;
  online?: boolean;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, user, name, src, fallback, online, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const displayName = user?.name || name || "Anonymous";
    const imageSrc = user?.avatar || src;
    const avatarFallback = fallback || getInitials(displayName);
    const avatarColor = generateAvatarColor(displayName);

    const handleImageError = () => {
      setImageError(true);
    };

    // Reset error state when src changes
    React.useEffect(() => {
      setImageError(false);
    }, [imageSrc]);

    return (
      <div ref={ref} className={cn(avatarVariants({ size, className }))} {...props}>
        {imageSrc && !imageError ? (
          <img 
            src={imageSrc} 
            alt={displayName}
            className="aspect-square h-full w-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className={cn(
            "flex h-full w-full items-center justify-center text-white font-medium",
            avatarColor,
            size === "sm" && "text-xs",
            size === "default" && "text-sm",
            size === "lg" && "text-base",
            size === "xl" && "text-lg"
          )}>
            {avatarFallback}
          </div>
        )}
        
        {online !== undefined && (
          <div className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
            online ? "bg-success-500" : "bg-gray-300",
            size === "sm" && "h-2 w-2",
            size === "default" && "h-2.5 w-2.5",
            size === "lg" && "h-3 w-3",
            size === "xl" && "h-3.5 w-3.5"
          )} />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };