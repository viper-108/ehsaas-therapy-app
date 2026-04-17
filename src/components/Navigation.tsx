import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, UserCircle, LogOut, LayoutDashboard, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/components/ChatProvider";
import { AuthModal } from "@/components/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'client' | 'therapist'>('client');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const { unreadCount } = useChat();
  const { t } = useLanguage();

  const navItems = [
    { name: t('nav.home'), path: "/" },
    { name: t('nav.about'), path: "/about" },
    { name: t('nav.team'), path: "/team" },
    { name: t('nav.services'), path: "/services" },
    { name: t('nav.blogs'), path: "/blogs" },
    { name: t('nav.contact'), path: "/contact" },
    { name: t('nav.faqs'), path: "/faqs" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const openAuth = (tab: 'client' | 'therapist') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = role === 'admin' ? '/admin-dashboard' : role === 'therapist' ? '/therapist-dashboard' : '/client-dashboard';

  return (
    <>
      <nav className="bg-background/95 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/lovable-uploads/c25d1384-6c00-42cb-b0bb-7157d822376b.png" alt="EHSAAS" className="h-12 w-auto" />
              <span className="text-xl font-bold text-primary">Ehsaas Therapy Centre</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {item.name}
                </Link>
              ))}

              {/* Toolbar: Language + Theme + Auth */}
              <div className="flex items-center gap-0.5 ml-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Auth Buttons */}
              {user ? (
                <>
                <NotificationBell />
                {role !== 'admin' && (
                  <Button variant="ghost" size="sm" className="ml-1 relative" onClick={() => navigate(`${dashboardPath}?tab=messages`)}>
                    <MessageCircle className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-1 flex items-center gap-2">
                      <UserCircle className="w-5 h-5" />
                      <span className="max-w-[100px] truncate">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate(dashboardPath)}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t('nav.dashboard')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              ) : (
                <Button size="sm" className="ml-2" onClick={() => openAuth('client')}>
                  {t('nav.login')}
                </Button>
              )}
            </div>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}

                  <div className="border-t pt-4 space-y-2">
                    {user ? (
                      <>
                        <p className="px-4 text-sm font-medium text-foreground">{user.name}</p>
                        <Link
                          to={dashboardPath}
                          onClick={() => setIsOpen(false)}
                          className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 flex items-center gap-2"
                        >
                          <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
                        </Link>
                        <button
                          onClick={() => { handleLogout(); setIsOpen(false); }}
                          className="px-4 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/5 flex items-center gap-2 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" /> {t('nav.logout')}
                        </button>
                      </>
                    ) : (
                        <Button className="w-full" onClick={() => { openAuth('client'); setIsOpen(false); }}>
                          {t('nav.login')}
                        </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authDefaultTab}
      />
    </>
  );
};

export default Navigation;
