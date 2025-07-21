// TEMPORARY: Mock implementation to avoid React hook conflicts
console.warn("Toast system temporarily disabled due to React hook conflicts");

// Mock toast function that just logs to console
function toast(options: any) {
  console.log("Toast (disabled):", options.title || options.description || "Toast message");
  return {
    id: "mock-toast",
    dismiss: () => {},
    update: () => {},
  };
}

// Mock useToast hook that doesn't use React hooks
function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: () => {},
  };
}

export { useToast, toast };
