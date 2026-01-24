// Shared utility functions
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
