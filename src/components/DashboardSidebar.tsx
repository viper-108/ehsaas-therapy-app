import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export interface SidebarItem {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string | number | null;
  /** Optional group/heading the item belongs to */
  group?: string;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  activeValue: string;
  onChange: (value: string) => void;
  /** Optional welcome content shown above the sidebar items */
  header?: React.ReactNode;
}

export function DashboardSidebar({ items, activeValue, onChange, header }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Group items by group; ungrouped items go in "main" group
  const grouped: Record<string, SidebarItem[]> = {};
  items.forEach(it => {
    const g = it.group || 'main';
    grouped[g] = grouped[g] || [];
    grouped[g].push(it);
  });
  const groupOrder = Object.keys(grouped);

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;
    const isActive = activeValue === item.value;
    return (
      <button
        key={item.value}
        onClick={() => { onChange(item.value); setMobileOpen(false); }}
        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm
          ${isActive
            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
            : 'text-foreground hover:bg-muted/60'}`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? '' : 'text-muted-foreground'}`} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge != null && item.badge !== 0 && item.badge !== '' && (
          <Badge className={`text-xs px-1.5 ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-warm text-white'}`}>
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <>
      {header && <div className="mb-3">{header}</div>}
      <nav className="space-y-1">
        {groupOrder.map(group => (
          <div key={group} className="mb-2">
            {group !== 'main' && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">
                {group}
              </p>
            )}
            <div className="space-y-1">
              {grouped[group].map(renderItem)}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile: hamburger menu */}
      <div className="lg:hidden mb-4 flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="w-4 h-4 mr-2" /> Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4 overflow-y-auto">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <span className="text-sm text-muted-foreground">
          Current: <strong className="text-foreground">{items.find(i => i.value === activeValue)?.label}</strong>
        </span>
      </div>

      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Card className="p-3 sticky top-24">
          {sidebarContent}
        </Card>
      </aside>
    </>
  );
}
