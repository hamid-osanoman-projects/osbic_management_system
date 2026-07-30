import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import KBarWrapper from '../components/admin/KBarWrapper';
import { GlobalNotificationListener } from '../components/shared/GlobalNotificationListener';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../hooks/useRealtime';

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { i18n } = useTranslation();
  const location = useLocation();
  const { profile } = useAuth();
  const isRtl = i18n.dir() === 'rtl';

  useRealtime(profile?.id);

  return (
    <KBarWrapper>
      <GlobalNotificationListener />
      <div className="flex h-screen w-full bg-background overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <AdminTopBar />
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth lg:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full max-w-[1600px] mx-auto"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </KBarWrapper>
  );
};

export default AdminLayout;
