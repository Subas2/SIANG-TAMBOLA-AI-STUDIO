import React from 'react';

interface Tab {
    key: string;
    label: string;
}

interface DashboardTabsProps {
    tabs: Tab[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    className?: string;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ tabs, activeTab, setActiveTab, className = "bg-black/20" }) => (
    <div className={`flex ${className}`}>
        {tabs.map(tab => (
            <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 py-3 text-sm font-semibold text-center transition-colors duration-300 ${activeTab === tab.key ? 'text-purple-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <span>{tab.label}</span>
                {activeTab === tab.key && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-purple-400 rounded-full shadow-[0_0_8px_#a78bfa]" />}
            </button>
        ))}
    </div>
);
