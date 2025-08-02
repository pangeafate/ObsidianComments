import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-500",
          actionButton: "group-[.toast]:bg-primary-600 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500",
        },
      }}
      {...props}
    />
  );
};

// Enhanced toast functions with consistent styling
const enhancedToast = {
  success: (message: string, options?: Parameters<typeof toast.success>[1]) => {
    return toast.success(message, {
      ...options,
      icon: "✅",
    });
  },
  
  error: (message: string, options?: Parameters<typeof toast.error>[1]) => {
    return toast.error(message, {
      ...options,
      icon: "❌",
    });
  },
  
  loading: (message: string, options?: Parameters<typeof toast.loading>[1]) => {
    return toast.loading(message, {
      ...options,
      icon: "🔄",
    });
  },
  
  info: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, {
      ...options,
      icon: "ℹ️",
    });
  },
  
  warning: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, {
      ...options,
      icon: "⚠️",
    });
  },
  
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: Parameters<typeof toast.promise>[2]
  ) => {
    return toast.promise(promise, msgs, {
      ...options,
    });
  }
};

export { Toaster, enhancedToast as toast };