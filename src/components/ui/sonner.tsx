// TEMPORARY: Mock implementation to avoid React hook conflicts
const Toaster = () => {
  console.warn("Sonner Toaster component temporarily disabled due to React hook conflicts");
  return null;
};

// Mock toast function
const toast = (message: any) => {
  console.log("Toast (disabled):", message);
};

export { Toaster, toast };
