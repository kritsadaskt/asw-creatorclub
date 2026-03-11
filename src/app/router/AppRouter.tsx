import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import { FriendGetFriendPage } from '../components/friendgetfriend/FriendGetFriendPage';
import { AffiliatePage } from '../components/affiliate/AffiliatePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/creatorclub" replace />} />
        <Route path="/creatorclub/*" element={<App />} />
        <Route path="/creatorclub/friendgetfriend/*" element={<FriendGetFriendPage />} />
        <Route path="/creatorclub/affiliate/*" element={<AffiliatePage />} />
        <Route path="*" element={<Navigate to="/creatorclub" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

