import {
  Anchor, Award, BedDouble, BookMarked, BookOpen, Book, Bot, Boxes, Brain, Briefcase, Castle, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Cloud, Code, Coins, Compass, Cookie, Copy, Crown, Dumbbell, Eye, Feather, Flame, Flower2, Footprints, Gamepad2, Gem, Ghost, Gift,
  HeartPulse, Hourglass, House, Info, Infinity as InfinityIcon, Layers, Leaf, Library, Lightbulb, Lock, Map as MapIcon, Medal, Menu, Minus,
  Moon, Mountain, Network, Pencil, Plus, Puzzle, Repeat, Rocket, RotateCcw, ScrollText, Settings, Share2, Shield, Skull, Smartphone, Sofa,
  Sparkles, Star, Sun, Sunrise, Swords, Target, Terminal, Trash2, Trees, Trophy, Tv, Undo2, Upload, Download, Utensils, Volume2, VolumeX,
  Wind, X, Zap, ChartColumn, CalendarDays, TriangleAlert, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  anchor: Anchor, award: Award, bed: BedDouble, bookmarked: BookMarked, bookopen: BookOpen, book: Book, bot: Bot, boxes: Boxes, brain: Brain,
  briefcase: Briefcase, castle: Castle, check: Check, down: ChevronDown, left: ChevronLeft, right: ChevronRight, clock: Clock, cloud: Cloud,
  code: Code, coins: Coins, compass: Compass, cookie: Cookie, copy: Copy, crown: Crown, dumbbell: Dumbbell, eye: Eye, feather: Feather,
  flame: Flame, flower: Flower2, footprints: Footprints, gamepad: Gamepad2, gem: Gem, ghost: Ghost, gift: Gift, heart: HeartPulse,
  hourglass: Hourglass, home: House, info: Info, infinity: InfinityIcon, layers: Layers, leaf: Leaf, library: Library, lightbulb: Lightbulb,
  lock: Lock, map: MapIcon, medal: Medal, menu: Menu, minus: Minus, moon: Moon, mountain: Mountain, network: Network, pencil: Pencil,
  plus: Plus, puzzle: Puzzle, repeat: Repeat, rocket: Rocket, reset: RotateCcw, scroll: ScrollText, settings: Settings, share: Share2,
  shield: Shield, skull: Skull, phone: Smartphone, sofa: Sofa, sparkles: Sparkles, star: Star, sun: Sun, sunrise: Sunrise, swords: Swords,
  target: Target, terminal: Terminal, trash: Trash2, trees: Trees, trophy: Trophy, tv: Tv, undo: Undo2, upload: Upload, download: Download,
  utensils: Utensils, volume: Volume2, mute: VolumeX, wind: Wind, x: X, zap: Zap, chart: ChartColumn, calendar: CalendarDays, warn: TriangleAlert,
};

export function Icon({ name, size = 18, className, strokeWidth = 1.8, style }: { name: string; size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }) {
  const C = MAP[name] ?? Sparkles;
  return <C size={size} className={className} strokeWidth={strokeWidth} style={style} aria-hidden />;
}
