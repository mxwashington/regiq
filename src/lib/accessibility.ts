// Accessibility Utilities
// Comprehensive accessibility helpers and utilities

// ARIA live region announcements
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.style.width = '1px';
  announcer.style.height = '1px';
  announcer.style.overflow = 'hidden';

  document.body.appendChild(announcer);
  announcer.textContent = message;

  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

// Focus management
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

// Keyboard navigation helpers
export function handleEnterKeyAsClick(handler: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}

export function handleArrowKeyNavigation(
  currentIndex: number,
  totalItems: number,
  onNavigate: (newIndex: number) => void
) {
  return (e: React.KeyboardEvent) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = totalItems - 1;
        break;
      default:
        return;
    }

    onNavigate(newIndex);
  };
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function meetsWCAGAALevel(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

export function meetsWCAGAAALevel(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

// Screen reader utilities
export function createAccessibleDescription(data: any, includeKeys: string[]): string {
  return includeKeys
    .map(key => {
      const value = data[key];
      if (value === null || value === undefined) return null;

      const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      return `${formattedKey}: ${value}`;
    })
    .filter(Boolean)
    .join(', ');
}

// Loading state announcements
export function announceLoadingState(isLoading: boolean, operation: string) {
  if (isLoading) {
    announceToScreenReader(`Loading ${operation}`, 'assertive');
  } else {
    announceToScreenReader(`${operation} loaded`, 'polite');
  }
}

// Error announcements
export function announceError(error: string) {
  announceToScreenReader(`Error: ${error}`, 'assertive');
}

// Success announcements
export function announceSuccess(message: string) {
  announceToScreenReader(`Success: ${message}`, 'polite');
}

// Table accessibility helpers
export function generateTableHeaders(columns: string[]): Record<string, string> {
  return columns.reduce((acc, col, index) => {
    acc[col] = `col-${index}`;
    return acc;
  }, {} as Record<string, string>);
}

export function getTableCellProps(columnName: string, headers: Record<string, string>) {
  return {
    headers: headers[columnName],
    role: 'gridcell',
  };
}

// Form accessibility helpers
export function generateFormFieldId(fieldName: string, formId?: string): string {
  return formId ? `${formId}-${fieldName}` : fieldName;
}

export function generateFormErrorId(fieldName: string, formId?: string): string {
  return `${generateFormFieldId(fieldName, formId)}-error`;
}

export function generateFormDescriptionId(fieldName: string, formId?: string): string {
  return `${generateFormFieldId(fieldName, formId)}-description`;
}

export function getFormFieldProps(
  fieldName: string,
  formId?: string,
  hasError?: boolean,
  hasDescription?: boolean
) {
  const id = generateFormFieldId(fieldName, formId);
  const errorId = hasError ? generateFormErrorId(fieldName, formId) : undefined;
  const descriptionId = hasDescription ? generateFormDescriptionId(fieldName, formId) : undefined;

  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ');

  return {
    id,
    'aria-invalid': hasError ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
  };
}

// Pagination accessibility
export function getPaginationButtonProps(
  pageNumber: number,
  currentPage: number,
  isDisabled: boolean
) {
  return {
    'aria-label': `Go to page ${pageNumber}`,
    'aria-current': pageNumber === currentPage ? 'page' : undefined,
    disabled: isDisabled,
    tabIndex: isDisabled ? -1 : 0,
  };
}

// Status announcements
export function announceStatusChange(oldStatus: string, newStatus: string, itemName?: string) {
  const item = itemName ? ` for ${itemName}` : '';
  announceToScreenReader(`Status changed from ${oldStatus} to ${newStatus}${item}`, 'polite');
}

// Progressive enhancement check
export function supportsReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function supportsHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Accessible data formatting
export function formatForScreenReader(value: any, type: 'number' | 'date' | 'currency' | 'percentage' = 'number'): string {
  if (value === null || value === undefined) {
    return 'Not available';
  }

  switch (type) {
    case 'number':
      return new Intl.NumberFormat().format(value);
    case 'date':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(value));
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
      }).format(value / 100);
    default:
      return String(value);
  }
}

// Skip link helper
export function createSkipLink(targetId: string, label: string) {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded',
    children: label,
  };
}

// Region landmarks
export function getRegionProps(role: 'main' | 'navigation' | 'search' | 'banner' | 'contentinfo' | 'complementary', label?: string) {
  return {
    role,
    'aria-label': label,
  };
}

// Live region hook for React components
export function useLiveRegion() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  };

  return { announce };
}