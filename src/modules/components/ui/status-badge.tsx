export function StatusBadge({ status }: { status: string | null }) {

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
    <div className={`project-status-badge ${status}`}>
      <span className="text-xs">
        {statusText}
      </span>
    </div>
);
}