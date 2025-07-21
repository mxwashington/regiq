// Temporary mock toast hook to replace useToast while we fix the provider hierarchy
export const useMockToast = () => {
  const toast = (options: any) => {
    console.log('Toast (temporarily disabled):', options);
  };
  
  return { toast };
};