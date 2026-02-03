type BadgeStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'default';
type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  status?: BadgeStatus;
  variant?: BadgeVariant;
  className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export function Badge({ children, status, variant, className = '' }: BadgeProps) {
  const styles = status ? statusStyles[status] : variant ? variantStyles[variant] : statusStyles.default;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${styles}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
