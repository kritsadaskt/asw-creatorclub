import { toLowerCase } from "zod";

export function StatusLabel({ status, className }: { status: string | null, className?: string }) {

  let statusText = '';

  if (status) {
    switch (status.toLowerCase()) {
      case 'ready':
        statusText = 'พร้อมอยู่';
        break;
      case 'new':
        statusText = 'ใหม่';
        break;
      case 'sold_out':
        statusText = 'Sold Out';
        break;
      default:
        statusText = status;
    }
  }
      
  return (
    <div className={`project-status-label absolute top-2 right-2 ${status?.toLowerCase()} ${className}`}>
      <span className="text-xs shadow-md">
        {statusText}
      </span>
    </div>
);
}