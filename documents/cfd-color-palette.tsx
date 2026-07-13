import React from 'react';
import { Copy, Check, Palette, Moon, Sun } from 'lucide-react';

const ColorPalette = () => {
  const [copiedColor, setCopiedColor] = React.useState<string | null>(null);
  const [darkMode, setDarkMode] = React.useState(false);

  const colors = {
    primary: [
      { 
        name: 'Ecclesial Blue', 
        hex: '#1E3A8A', 
        rgb: 'rgb(30, 58, 138)',
        hsl: 'hsl(219, 64%, 33%)',
        usage: 'Primary brand, headers, navigation',
        gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)'
      },
      { 
        name: 'Royal Sapphire', 
        hex: '#2563EB', 
        rgb: 'rgb(37, 99, 235)',
        hsl: 'hsl(221, 83%, 53%)',
        usage: 'Interactive elements, links, CTAs',
        gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)'
      },
      { 
        name: 'Celestial Blue', 
        hex: '#3B82F6', 
        rgb: 'rgb(59, 130, 246)',
        hsl: 'hsl(217, 91%, 60%)',
        usage: 'Hover states, focus indicators',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
      },
    ],
    sacred: [
      { 
        name: 'Liturgical Gold', 
        hex: '#F59E0B', 
        rgb: 'rgb(245, 158, 11)',
        hsl: 'hsl(38, 92%, 50%)',
        usage: 'Key highlights, sacred elements',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
      },
      { 
        name: 'Golden Amber', 
        hex: '#FBBF24', 
        rgb: 'rgb(251, 191, 36)',
        hsl: 'hsl(43, 96%, 56%)',
        usage: 'Warnings, important notices',
        gradient: 'linear-gradient(135deg, #FBBF24 0%, #FCD34D 100%)'
      },
      { 
        name: 'Halo Yellow', 
        hex: '#FEF3C7', 
        rgb: 'rgb(254, 243, 199)',
        hsl: 'hsl(48, 96%, 89%)',
        usage: 'Subtle highlights, backgrounds',
        gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FEF9E7 100%)'
      },
    ],
    mystical: [
      { 
        name: 'Aqua Baptism', 
        hex: '#06B6D4', 
        rgb: 'rgb(6, 182, 212)',
        hsl: 'hsl(187, 95%, 43%)',
        usage: 'Secondary actions, info states',
        gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)'
      },
      { 
        name: 'Heavenly Cyan', 
        hex: '#67E8F9', 
        rgb: 'rgb(103, 232, 249)',
        hsl: 'hsl(186, 91%, 69%)',
        usage: 'Backgrounds, cards, panels',
        gradient: 'linear-gradient(135deg, #67E8F9 0%, #A5F3FC 100%)'
      },
      { 
        name: 'Divine Light', 
        hex: '#ECFEFF', 
        rgb: 'rgb(236, 254, 255)',
        hsl: 'hsl(183, 100%, 96%)',
        usage: 'Soft backgrounds, containers',
        gradient: 'linear-gradient(135deg, #ECFEFF 0%, #F0FDFF 100%)'
      },
    ],
    foundation: [
      { 
        name: 'Midnight Mass', 
        hex: '#0F172A', 
        rgb: 'rgb(15, 23, 42)',
        hsl: 'hsl(222, 47%, 11%)',
        usage: 'Dark mode background, text',
        gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
      },
      { 
        name: 'Slate Stone', 
        hex: '#475569', 
        rgb: 'rgb(71, 85, 105)',
        hsl: 'hsl(215, 19%, 35%)',
        usage: 'Secondary text, muted elements',
        gradient: 'linear-gradient(135deg, #475569 0%, #64748B 100%)'
      },
      { 
        name: 'Pearl Gray', 
        hex: '#CBD5E1', 
        rgb: 'rgb(203, 213, 225)',
        hsl: 'hsl(214, 20%, 84%)',
        usage: 'Borders, dividers, disabled',
        gradient: 'linear-gradient(135deg, #CBD5E1 0%, #E2E8F0 100%)'
      },
      { 
        name: 'Altar White', 
        hex: '#F8FAFC', 
        rgb: 'rgb(248, 250, 252)',
        hsl: 'hsl(210, 20%, 98%)',
        usage: 'Light backgrounds, cards',
        gradient: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)'
      },
      { 
        name: 'Pure White', 
        hex: '#FFFFFF', 
        rgb: 'rgb(255, 255, 255)',
        hsl: 'hsl(0, 0%, 100%)',
        usage: 'Primary backgrounds, clean surfaces',
        gradient: 'linear-gradient(135deg, #FFFFFF 0%, #FEFEFE 100%)'
      },
    ],
    semantic: [
      { 
        name: 'Grace Green', 
        hex: '#10B981', 
        rgb: 'rgb(16, 185, 129)',
        hsl: 'hsl(158, 84%, 39%)',
        usage: 'Success states, confirmations',
        gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
      },
      { 
        name: 'Passion Red', 
        hex: '#EF4444', 
        rgb: 'rgb(239, 68, 68)',
        hsl: 'hsl(0, 84%, 60%)',
        usage: 'Errors, warnings, deletions',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
      },
      { 
        name: 'Violet Vestment', 
        hex: '#8B5CF6', 
        rgb: 'rgb(139, 92, 246)',
        hsl: 'hsl(258, 90%, 66%)',
        usage: 'Special features, premium',
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
      },
    ]
  };

  const copyToClipboard = (text: string, colorName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(colorName);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const ColorCard = ({ color, index }: { color: any; index: number }) => (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
      <div 
        className="h-40 w-full relative transition-transform duration-500 group-hover:scale-110"
        style={{ background: color.gradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-black/10"></div>
      </div>
      <div className="p-5 bg-white dark:bg-slate-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">{color.name}</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between group/hex">
            <span className="text-gray-500 dark:text-gray-400 font-medium">HEX</span>
            <button
              onClick={() => copyToClipboard(color.hex, `${color.name}-hex`)}
              className="flex items-center gap-2 font-mono text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {color.hex}
              {copiedColor === `${color.name}-hex` ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 opacity-0 group-hover/hex:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between group/rgb">
            <span className="text-gray-500 dark:text-gray-400 font-medium">RGB</span>
            <button
              onClick={() => copyToClipboard(color.rgb, `${color.name}-rgb`)}
              className="flex items-center gap-2 font-mono text-xs text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {color.rgb}
              {copiedColor === `${color.name}-rgb` ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 opacity-0 group-hover/rgb:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between group/hsl">
            <span className="text-gray-500 dark:text-gray-400 font-medium">HSL</span>
            <button
              onClick={() => copyToClipboard(color.hsl, `${color.name}-hsl`)}
              className="flex items-center gap-2 font-mono text-xs text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {color.hsl}
              {copiedColor === `${color.name}-hsl` ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 opacity-0 group-hover/hsl:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{color.usage}</p>
        </div>
      </div>
    </div>
  );

  const Section = ({ title, colors, icon, gradient }: { title: string; colors: any[]; icon: React.ReactNode; gradient: string }) => (
    <section className="mb-16">
      <div className="flex items-center gap-4 mb-8">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {colors.map((color, idx) => (
          <ColorCard key={idx} color={color} index={idx} />
        ))}
      </div>
    </section>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50'}`}>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-16 relative">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-0 right-0 p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {darkMode ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-700" />}
          </button>
          
          <div className="inline-flex items-center gap-3 mb-6">
            <Palette className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Catholic Faith Defenders
            </h1>
          </div>
          <p className="text-2xl text-gray-600 dark:text-gray-300 font-light">Elegant Color System</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Inspired by sacred tradition • Designed for modern interfaces</p>
        </div>

        {/* Primary Colors */}
        <Section 
          title="Ecclesial Blues" 
          colors={colors.primary}
          icon={<div className="w-6 h-6 rounded-full bg-white"></div>}
          gradient="linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)"
        />

        {/* Sacred Colors */}
        <Section 
          title="Sacred Gold" 
          colors={colors.sacred}
          icon={<div className="w-6 h-6 rounded-full bg-white"></div>}
          gradient="linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)"
        />

        {/* Mystical Colors */}
        <Section 
          title="Mystical Waters" 
          colors={colors.mystical}
          icon={<div className="w-6 h-6 rounded-full bg-white"></div>}
          gradient="linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)"
        />

        {/* Foundation Colors */}
        <Section 
          title="Foundation Neutrals" 
          colors={colors.foundation}
          icon={<div className="w-6 h-6 rounded-full bg-white"></div>}
          gradient="linear-gradient(135deg, #0F172A 0%, #CBD5E1 100%)"
        />

        {/* Semantic Colors */}
        <Section 
          title="Semantic Accents" 
          colors={colors.semantic}
          icon={<div className="w-6 h-6 rounded-full bg-white"></div>}
          gradient="linear-gradient(135deg, #10B981 0%, #8B5CF6 100%)"
        />

        {/* Enhanced UI Examples */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Interface Examples</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Light Mode Card */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Light Theme</h3>
              </div>
              
              <button className="w-full py-4 px-6 rounded-xl font-semibold text-white mb-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}>
                Primary Action
              </button>
              
              <button className="w-full py-4 px-6 rounded-xl font-semibold mb-3 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: '#0F172A' }}>
                Sacred Highlight
              </button>
              
              <button className="w-full py-4 px-6 rounded-xl font-semibold mb-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)', color: '#FFFFFF' }}>
                Mystical Action
              </button>
              
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100">
                <p className="text-sm text-gray-600 leading-relaxed">
                  "Faith and reason are like two wings on which the human spirit rises to the contemplation of truth."
                </p>
                <p className="text-xs text-gray-500 mt-2 font-medium">— St. John Paul II</p>
              </div>
            </div>

            {/* Dark Mode Card */}
            <div className="rounded-3xl shadow-2xl p-8 border"
              style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderColor: '#334155' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-lg">
                  <Moon className="w-6 h-6 text-slate-900" />
                </div>
                <h3 className="text-2xl font-bold text-white">Dark Theme</h3>
              </div>
              
              <button className="w-full py-4 px-6 rounded-xl font-semibold text-white mb-3 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}>
                Primary Action
              </button>
              
              <button className="w-full py-4 px-6 rounded-xl font-semibold mb-3 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: '#0F172A' }}>
                Sacred Highlight
              </button>
              
              <button className="w-full py-4 px-6 rounded-xl font-semibold text-white mb-4 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' }}>
                Premium Feature
              </button>
              
              <div className="p-6 rounded-2xl border"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderColor: '#3B82F6' }}>
                <p className="text-sm text-blue-100 leading-relaxed">
                  "The glory of God is man fully alive, and the life of man is the vision of God."
                </p>
                <p className="text-xs text-blue-300 mt-2 font-medium">— St. Irenaeus</p>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Tailwind Config */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 mb-8 border border-gray-100 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Tailwind CSS Configuration</h2>
          <pre className="bg-slate-900 text-gray-100 p-6 rounded-2xl overflow-x-auto text-sm leading-relaxed">
{`// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Primary - Ecclesial Blues
        'ecclesial': {
          DEFAULT: '#1E3A8A',
          light: '#3B82F6',
          dark: '#1E293B',
        },
        // Sacred Gold
        'sacred': {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          lighter: '#FEF3C7',
        },
        // Mystical Waters
        'mystical': {
          DEFAULT: '#06B6D4',
          light: '#67E8F9',
          lighter: '#ECFEFF',
        },
        // Semantic
        'grace': '#10B981',
        'passion': '#EF4444',
        'vestment': '#8B5CF6',
      },
      backgroundImage: {
        'ecclesial-gradient': 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
        'sacred-gradient': 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'mystical-gradient': 'linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)',
      }
    }
  }
}`}
          </pre>
        </section>

        {/* Color Psychology */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Ecclesial Blues</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">Represents faith, trust, divine wisdom, and the heavenly realm. Evokes contemplation and spiritual depth.</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">Sacred Gold</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">Symbolizes divine glory, holiness, and celebration. Used in liturgical seasons and sacred moments of triumph.</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 p-6 rounded-2xl border border-cyan-200 dark:border-cyan-800">
            <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-2">Mystical Waters</h3>
            <p className="text-sm text-cyan-700 dark:text-cyan-300">Represents baptism, purification, and the Holy Spirit. Evokes renewal and spiritual cleansing.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ColorPalette;