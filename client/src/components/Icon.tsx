import {
  Car, ClipboardList, Droplets, GraduationCap, LifeBuoy, Utensils,
  Armchair, ShieldAlert, SprayCan, Zap, ArrowDown, ArrowDownRight, ArrowLeft, ArrowUp, ArrowUpRight, ChevronUp, Minus, ArrowUpDown, Building2, Calendar, Check, ChevronLeft, ChevronRight, CircleCheck, CirclePlus, CircleHelp,
  Clock, Download, Eye, EyeOff, Fan, FileText, Filter, Flag, Gauge, Headset, ImagePlus, Inbox, LayoutDashboard, Lightbulb, ListChecks, LoaderCircle,
  LogOut, MapPin, MessageSquareText, Monitor, Projector, Menu, Moon, RotateCcw, Search, Settings, ShieldCheck, Sparkles, Sun, TrendingUp, TriangleAlert, User, Users, Wifi, Wrench, X,
} from 'lucide-react';
import type { Category } from '../types/complaint';

const icons = {
  dashboard: LayoutDashboard, plus: CirclePlus, list: ListChecks,
  computer: Monitor, projector: Projector, fan: Fan, light: Lightbulb, wifi: Wifi, other: CircleHelp,
  search: Search, x: X, sparkle: Sparkles, image: ImagePlus, back: ArrowLeft, user: User, shield: ShieldCheck, logout: LogOut,
  eye: Eye, eyeoff: EyeOff, check: Check, download: Download, prev: ChevronLeft, next: ChevronRight, sort: ArrowUpDown, asc: ArrowUp, desc: ArrowDown,
  flag: Flag, clock: Clock, alert: TriangleAlert, loader: LoaderCircle, users: Users, calendar: Calendar, trend: TrendingUp, building: Building2,
  zap: Zap, armchair: Armchair, spray: SprayCan, shieldalert: ShieldAlert, headset: Headset, pin: MapPin, inbox: Inbox, file: FileText, filter: Filter, reset: RotateCcw, done: CircleCheck, gauge: Gauge, wrench: Wrench, note: MessageSquareText,
  campus: GraduationCap, help: LifeBuoy, clipboard: ClipboardList, droplets: Droplets, utensils: Utensils, car: Car, settings: Settings, chevup: ChevronUp, arrowup: ArrowUpRight, arrowdown: ArrowDownRight, minus: Minus, menu: Menu, sun: Sun, moon: Moon,
} as const;

export type IconName = keyof typeof icons;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const C = icons[name];
  return <C size={size} aria-hidden="true" focusable="false" className={className} />;
}

const CATEGORY_ICON: Record<Category, IconName> = {
  computer_hardware: 'computer', projector_av: 'projector', internet_network: 'wifi', electrical: 'zap', building_maintenance: 'building',
  water_plumbing: 'droplets', cleanliness_sanitation: 'spray', canteen: 'utensils', furniture_classroom: 'armchair', parking_transport: 'car',
  safety_security: 'shieldalert', other: 'other',
};

/** Icon for a complaint category. */
export function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) {
  return <Icon name={CATEGORY_ICON[category]} size={size} />;
}
