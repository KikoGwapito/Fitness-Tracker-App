import React from 'react';
import { Home, Calendar, BarChart2, Menu as MenuIcon, Camera, LogOut, User, Settings, Star, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { TabType } from './BottomNav';

interface SidebarProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  onSnapClick: () => void;
  userEmail: string;
  onLogout: () => void;
  onNavigateSubPage: (page: string) => void;
}

export function Sidebar({ activeTab, onChange, onSnapClick, userEmail, onLogout, onNavigateSubPage }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'history', icon: Calendar, label: 'History' },
    { id: 'progress', icon: BarChart2, label: 'Progress' },
    { id: 'menu', icon: MenuIcon, label: 'Menu' },
  ] as const;

  const subPages = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'favorites', icon: Star, label: 'Favorites' },
    { id: 'app-info', icon: Info, label: 'App Info' },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-bg border-r border-white/5 p-6 z-50">
      <div className="mb-12">
        <h1 className="text-2xl font-display uppercase tracking-[0.2em] text-white">
          G-<span className="text-accent font-light">Refine</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        <div className="text-[10px] font-display uppercase tracking-widest text-white/20 mb-4 px-4">Main Menu</div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                onChange(tab.id);
                onNavigateSubPage('none');
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "bg-accent text-bg font-medium" 
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-bg" : "text-accent/60 group-hover:text-accent")} />
              <span className="text-sm font-display uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}

        <div className="pt-8 pb-4">
          <div className="text-[10px] font-display uppercase tracking-widest text-white/20 mb-4 px-4">Quick Access</div>
          {subPages.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                onClick={() => {
                  onChange('menu');
                  onNavigateSubPage(page.id);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all duration-300 group"
              >
                <Icon className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors" />
                <span className="text-sm font-display uppercase tracking-wider">{page.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-8">
          <button
            onClick={onSnapClick}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-accent text-bg font-display uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/10"
          >
            <Camera className="w-5 h-5" />
            <span>Log Meal</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-display uppercase tracking-widest text-white/20 truncate">Logged in as</p>
            <p className="text-xs text-white truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-danger/60 hover:bg-danger/10 hover:text-danger transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-display uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </aside>
  );
}
