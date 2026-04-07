import { toLowerCase } from "zod";

export function StatusLabel({ status }: { status: string | null }) {

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
    <div className={`project-status-label absolute top-2 right-2 ${status?.toLowerCase()}`}>
      <span className="text-xs shadow-md">
        {statusText}
      </span>
    </div>
);
}