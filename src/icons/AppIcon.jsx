// Registro central de ícones (Lucide) usados no app — substitui os emoji
// antigos por um sistema de ícones consistente, em traço fino, do mesmo
// estilo em qualquer tela/plataforma. Dados (blocos, conquistas, níveis,
// livros) guardam apenas o NOME do ícone (string); este componente resolve
// o nome pro componente React real. Import nomeado (não `import *`) pra o
// bundler só incluir os ícones realmente usados.
import {
  Home, HandHeart, Compass, BookOpen, BarChart3, User,
  Scroll, Swords, Music, Flame, Cross, Globe, Mail, Eye,
  Sprout, Star, Rocket,
  BookMarked, Library, Archive, TrendingUp, Crown,
  Repeat, Sparkles, Award, Hourglass, Timer,
  Search, Shield, GraduationCap, Bird, Feather,
  Bell, Moon, Cloud, Bot, RefreshCw, LogOut,
  Map, StickyNote, Lightbulb, PenLine,
  Folder, Check, MessageCircle, Trash2,
  Landmark, Waves, Tent, Mountain, Castle, Building, Footprints,
  Construction, Gem, Wind, Tornado, HeartCrack, Bug, Users, Fish,
  Zap, HelpCircle, Scale, Megaphone, Baby, Handshake, Wheat, Heart,
  Smile, ClipboardList, Lock, TreePalm, Wrench, TriangleAlert, Siren,
  Sailboat, Amphora, PawPrint, MapPin, Circle,
  CheckCircle2, ArrowUp, ChevronDown, CloudRain, ArrowLeft,
  X, ChevronRight, Pin, UserPlus, Calendar, Type,
} from 'lucide-react'

const REGISTRY = {
  Home, HandHeart, Compass, BookOpen, BarChart3, User,
  Scroll, Swords, Music, Flame, Cross, Globe, Mail, Eye,
  Sprout, Star, Rocket,
  BookMarked, Library, Archive, TrendingUp, Crown,
  Repeat, Sparkles, Award, Hourglass, Timer,
  Search, Shield, GraduationCap, Bird, Feather,
  Bell, Moon, Cloud, Bot, RefreshCw, LogOut,
  Map, StickyNote, Lightbulb, PenLine,
  Folder, Check, MessageCircle, Trash2,
  Landmark, Waves, Tent, Mountain, Castle, Building, Footprints,
  Construction, Gem, Wind, Tornado, HeartCrack, Bug, Users, Fish,
  Zap, HelpCircle, Scale, Megaphone, Baby, Handshake, Wheat, Heart,
  Smile, ClipboardList, Lock, TreePalm, Wrench, TriangleAlert, Siren,
  Sailboat, Amphora, PawPrint, MapPin,
  CheckCircle2, ArrowUp, ChevronDown, CloudRain, ArrowLeft,
  X, ChevronRight, Pin, UserPlus, Calendar, Type,
}

export default function AppIcon({ name, size = 18, ...props }) {
  const Cmp = REGISTRY[name] ?? Circle
  return <Cmp size={size} {...props} />
}
