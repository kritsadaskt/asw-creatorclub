export function StatusBadge({ status, className }: { status: string | null, className?: string }) {

  let statusText = '';

  if (status) {
    switch (status) {
      case 'ready':
        statusText = 'โครงการพร้อมอยู่';
        break;
      case 'new':
        statusText = 'โครงการใหม่';
        break;
      case 'sold_out':
        statusText = 'Sold Out';
        break;
      default:
        statusText = status;
    }
  }
      
  return (
    <div className={`project-status-badge ${status} ${className}`}>
      <span className="text-xs">
        {statusText}
      </span>
    </div>
);
}