interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-gray-200';

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <Skeleton variant="text" className="w-3/4 h-6 mb-4" />
      <Skeleton variant="text" className="w-full h-4 mb-2" />
      <Skeleton variant="text" className="w-full h-4 mb-2" />
      <Skeleton variant="text" className="w-2/3 h-4" />
    </div>
  );
}
