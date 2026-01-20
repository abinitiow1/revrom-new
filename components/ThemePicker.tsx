
import React, { useState, useMemo, useId } from 'react';
import type { ThemeOption, SiteContent, ColorSet } from '../types';

interface ThemePickerProps {
    themes: ThemeOption[];
    siteContent: SiteContent;
    onClose: () => void;
    onSave: (updatedContent: SiteContent) => void;
}

const ThemePreview: React.FC<{ theme: ThemeOption, isActive: boolean, onClick: () => void }> = ({ theme, isActive, onClick }) => {
    const { colors } = theme;
    return (
        <button onClick={onClick} className={`w-full text-left rounded-lg p-2 transition-all ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-dark-card' : 'ring-1 ring-border dark:ring-dark-border'}`}>
            <div className="w-full h-24 rounded-md flex flex-col p-2 gap-1.5" style={{ backgroundColor: colors.light.card }}>
                <div className="flex items-center justify-between h-5 rounded-sm px-2" style={{ backgroundColor: colors.light.background }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.light.primary }}></div>
                    <div className="w-8 h-2 rounded-full" style={{ backgroundColor: colors.light.mutedForeground }}></div>
                </div>
                <div className="h-3 w-4/5 rounded-full" style={{ backgroundColor: colors.light.foreground, opacity: 0.8 }}></div>
                <div className="h-3 w-3/5 rounded-full" style={{ backgroundColor: colors.light.foreground, opacity: 0.6 }}></div>
                <div className="h-3 w-4/6 rounded-full" style={{ backgroundColor: colors.light.foreground, opacity: 0.4 }}></div>
            </div>
            <p className="font-semibold text-center mt-2 text-sm text-foreground dark:text-dark-foreground">{theme.name}</p>
        </button>
    );
};

const ColorInput: React.FC<{ label: string, color: string, onChange: (color: string) => void, helpText?: string }> = ({ label, color, onChange, helpText }) => {
    const inputId = useId();
    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-foreground dark:text-dark-foreground">{label}</label>
            <div className="mt-1 flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded-full border border-border dark:border-dark-border shadow-sm">
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => onChange(e.target.value)} 
                        className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                        aria-label={`${label} color picker`}
                    />
                </div>
                <input 
                    id={inputId}
                    type="text" 
                    value={color} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="w-full p-2 border rounded bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground border-border dark:border-dark-border focus:ring-brand-primary focus:border-brand-primary text-sm font-mono uppercase"
                />
            </div>
            {helpText && <p className="text-xs text-muted-foreground dark:text-dark-muted-foreground mt-1">{helpText}</p>}
        </div>
    );
};

// Mapping technical keys to user-friendly labels
const COLOR_FIELDS: { key: keyof ColorSet; label: string; help: string }[] = [
    { key: 'primary', label: 'Brand Primary', help: 'Buttons, Links, Highlights' },
    { key: 'primaryDark', label: 'Brand Hover', help: 'Hover states for buttons' },
    { key: 'accentGold', label: 'Accent Color', help: 'Icons, Badges, Stars' },
    { key: 'background', label: 'Page Background', help: 'Main body background' },
    { key: 'card', label: 'Surface / Card', help: 'Headers, Cards, Modals' },
    { key: 'foreground', label: 'Main Text', help: 'Headings, Body text' },
    { key: 'mutedForeground', label: 'Secondary Text', help: 'Subtitles, Metadata' },
    { key: 'border', label: 'Borders', help: 'Dividers, Input borders' },
];


const ThemePicker: React.FC<ThemePickerProps> = ({ themes, siteContent, onClose, onSave }) => {
    const [tempContent, setTempContent] = useState(siteContent);
    const activeThemeName = tempContent.activeTheme;

    const handleThemeSelect = (themeName: string) => {
        setTempContent(prev => ({ ...prev, activeTheme: themeName }));
    };

    const handleCustomColorChange = (mode: 'light' | 'dark', property: keyof ColorSet, value: string) => {
        setTempContent(prev => ({
            ...prev,
            customThemeColors: {
                ...prev.customThemeColors,
                [mode]: {
                    ...prev.customThemeColors[mode],
                    [property]: value,
                }
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-card dark:bg-dark-card rounded-lg shadow-xl max-w-5xl w-full mx-4 h-[90vh] flex flex-col border border-border dark:border-dark-border" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-foreground dark:text-dark-foreground">Theme Editor</h2>
                        <p className="text-sm text-muted-foreground dark:text-dark-muted-foreground">Select a preset or fully customize your color palette.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-foreground dark:text-dark-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6">
                    <h3 className="text-lg font-bold mb-4 text-foreground dark:text-dark-foreground">1. Select Base Theme</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                        {themes.map(theme => (
                            <ThemePreview key={theme.name} theme={theme} isActive={activeThemeName === theme.name} onClick={() => handleThemeSelect(theme.name)} />
                        ))}
                         <button onClick={() => handleThemeSelect('Custom')} className={`w-full text-left rounded-lg p-2 transition-all ${activeThemeName === 'Custom' ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-dark-card' : 'ring-1 ring-border dark:ring-dark-border'}`}>
                            <div className="w-full h-24 rounded-md flex items-center justify-center p-2 bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500">
                                <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm shadow-lg"></div>
                            </div>
                            <p className="font-semibold text-center mt-2 text-sm text-foreground dark:text-dark-foreground">Custom Theme</p>
                        </button>
                    </div>

                    {activeThemeName === 'Custom' && (
                        <div className="animate-fade-in">
                             <h3 className="text-lg font-bold mb-4 text-foreground dark:text-dark-foreground border-t border-border dark:border-dark-border pt-6">2. Customize All Color Codes</h3>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Light Mode Column */}
                                <div className="bg-white/50 dark:bg-black/20 p-6 rounded-xl border border-border dark:border-dark-border">
                                    <div className="flex items-center gap-2 mb-4 text-yellow-600 dark:text-yellow-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        <h4 className="font-bold text-lg">Light Mode Palette</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        {COLOR_FIELDS.map((field) => (
                                            <ColorInput
                                                key={`light-${field.key}`}
                                                label={field.label}
                                                helpText={field.help}
                                                color={tempContent.customThemeColors.light[field.key]}
                                                onChange={(color) => handleCustomColorChange('light', field.key, color)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Dark Mode Column */}
                                <div className="bg-gray-900/50 dark:bg-black/50 p-6 rounded-xl border border-border dark:border-dark-border">
                                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                        <h4 className="font-bold text-lg">Dark Mode Palette</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        {COLOR_FIELDS.map((field) => (
                                            <ColorInput
                                                key={`dark-${field.key}`}
                                                label={field.label}
                                                helpText={field.help}
                                                color={tempContent.customThemeColors.dark[field.key]}
                                                onChange={(color) => handleCustomColorChange('dark', field.key, color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center space-x-4 p-6 border-t border-border dark:border-dark-border bg-card dark:bg-dark-card rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-muted-foreground hover:text-foreground font-medium transition-colors">Cancel</button>
                    <button type="button" onClick={() => onSave(tempContent)} className="px-8 py-2.5 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-primary-dark shadow-lg transform hover:scale-105 transition-all">Save & Apply Theme</button>
                </div>
            </div>
        </div>
    );
};

export default ThemePicker;
