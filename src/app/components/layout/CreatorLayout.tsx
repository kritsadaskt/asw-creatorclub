import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../utils/storage';

interface CreatorLayoutProps {
  onLogout: () => void;
}

export function CreatorLayout({ onLogout }: CreatorLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg" 
              alt="AssetWise Logo" 
              className="h-5"
            />
          </div>
          <nav className="flex gap-4 items-center">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              โปรไฟล์
            </NavLink>
            <NavLink
              to="/affiliate"
              className={({ isActive }) =>
                `transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              สร้างลิงค์
            </NavLink>
            <NavLink
              to="/links"
              className={({ isActive }) =>
                `transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              ลิงค์ของฉัน
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ออกจากระบบ
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <Outlet />
    </div>
  );
}
