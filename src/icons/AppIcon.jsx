// Registro central de ícones (Lucide) usados no app — substitui os emoji
// antigos por um sistema de ícones consistente, em traço fino, do mesmo
// estilo em qualquer tela/plataforma. Dados (blocos, conquistas, níveis,
// livros) guardam apenas o NOME do ícone (string); este componente resolve
// o nome pro componente React real. Import nomeado (não `import *`) pra o
// bundler só incluir os ícones realmente usados.
import {
  Home, HandHeart, Compass, BookOpen, BarChart3, User,
  Scroll, Swords, Music, Flame, Cross, Globe, Mail, Eye, EyeOff,
  Sprout, Star, Rocket,
  BookMarked, Library, Archive, TrendingUp, Crown,
  Repeat, Sparkles, Award, Hourglass, Timer,
  Search, Shield, GraduationCap, Bird, Feather,
  Bell, Moon, Cloud, RefreshCw, LogOut,
  Map, StickyNote, Lightbulb, PenLine,
  Folder, Check, MessageCircle, Trash2, Download,
  Landmark, Waves, Tent, Mountain, Castle, Building, Footprints,
  Construction, Gem, Wind, Tornado, HeartCrack, Bug, Users, Fish,
  Zap, HelpCircle, Scale, Megaphone, Baby, Handshake, Wheat, Heart,
  Smile, ClipboardList, Lock, TreePalm, Wrench, TriangleAlert, Siren,
  Sailboat, Amphora, PawPrint, MapPin, Circle,
  CheckCircle2, ArrowUp, ChevronDown, ChevronUp, CloudRain, ArrowLeft,
  X, ChevronRight, ChevronLeft, ArrowRight, Pin, UserPlus, Calendar, Type, Gift,
  Highlighter, Share2, Pencil, SlidersHorizontal, Plus,
  Play, Pause, AudioLines, MoreVertical, Copy, AlignLeft,
} from 'lucide-react'

// A versão de lucide-react instalada (1.23.0) não inclui o ícone do
// Instagram — desenhado à mão no mesmo estilo (traço, sem preenchimento)
// dos demais, pra ficar visualmente idêntico aos ícones do Lucide.
function Instagram({ size = 18, color = 'currentColor', ...props }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

const REGISTRY = {
  Home, HandHeart, Compass, BookOpen, BarChart3, User,
  Scroll, Swords, Music, Flame, Cross, Globe, Mail, Eye, EyeOff,
  Sprout, Star, Rocket,
  BookMarked, Library, Archive, TrendingUp, Crown,
  Repeat, Sparkles, Award, Hourglass, Timer,
  Search, Shield, GraduationCap, Bird, Feather,
  Bell, Moon, Cloud, RefreshCw, LogOut,
  Map, StickyNote, Lightbulb, PenLine,
  Folder, Check, MessageCircle, Trash2, Download,
  Landmark, Waves, Tent, Mountain, Castle, Building, Footprints,
  Construction, Gem, Wind, Tornado, HeartCrack, Bug, Users, Fish,
  Zap, HelpCircle, Scale, Megaphone, Baby, Handshake, Wheat, Heart,
  Smile, ClipboardList, Lock, TreePalm, Wrench, TriangleAlert, Siren,
  Sailboat, Amphora, PawPrint, MapPin,
  CheckCircle2, ArrowUp, ChevronDown, ChevronUp, CloudRain, ArrowLeft,
  X, ChevronRight, ChevronLeft, ArrowRight, Pin, UserPlus, Calendar, Type, Gift,
  Highlighter, Share2, Pencil, SlidersHorizontal, Plus,
  Play, Pause, AudioLines, MoreVertical, Copy, AlignLeft,
  Instagram,
}

export default function AppIcon({ name, size = 18, ...props }) {
  const Cmp = REGISTRY[name] ?? Circle
  return <Cmp size={size} {...props} />
}
