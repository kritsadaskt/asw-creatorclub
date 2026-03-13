import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import { FriendGetFriendPage } from '../components/friendgetfriend/FriendGetFriendPage';
import { AffiliatePage } from '../components/affiliate/AffiliatePage';

export function AppRouter() {
  return (
    <BrowserRouter basename="/creatorclub">
      <Routes>
        <Route path="/friendgetfriend/*" element={<FriendGetFriendPage />} />
        <Route path="/affiliate/*" element={<AffiliatePage />} />
        <Route path="/*" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

