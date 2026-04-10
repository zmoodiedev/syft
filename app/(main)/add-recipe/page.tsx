'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecipeForm from '@/app/components/RecipeForm';
import UrlInput from '@/app/components/UrlInput';
import BulkEntryForm from '@/app/components/BulkEntryForm';
import { FiArrowLeft, FiFileText, FiGlobe, FiCamera, FiList } from 'react-icons/fi';

type OptionId = 'url' | 'scan' | 'bulk' | 'manual';

const OPTIONS: { id: OptionId; icon: React.ElementType; title: string; subtitle: string }[] = [
    { id: 'url',    icon: FiGlobe,    title: 'Import from URL',   subtitle: 'Paste any recipe link'   },
    { id: 'scan',   icon: FiCamera,   title: 'Scan a recipe',     subtitle: 'Upload a photo'           },
    { id: 'bulk',   icon: FiList,     title: 'Bulk entry',        subtitle: 'Copy and paste text'      },
    { id: 'manual', icon: FiFileText, title: 'Manual entry',      subtitle: 'Start from scratch'       },
];

function FormPanel({ id }: { id: OptionId }) {
    if (id === 'url')    return <UrlInput />;
    if (id === 'scan')   return <RecipeForm scanMode={true} />;
    if (id === 'bulk')   return <BulkEntryForm />;
    return <RecipeForm />;
}

export default function AddRecipe() {
    const [selected, setSelected] = useState<OptionId>('url');
    const [mobileView, setMobileView] = useState<'options' | 'form'>('options');

    const handleSelect = (id: OptionId) => {
        setSelected(id);
        setMobileView('form');
    };

    return (
        <div className="min-h-screen bg-eggshell">
            <div className="container mx-auto px-6 py-10 md:py-14">

                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-cast-iron">Add a recipe</h1>
                    <p className="text-sm text-steel mt-1">Choose how you want to add it.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Sidebar */}
                    <div className={`w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-8 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="bg-cast-iron px-5 py-4">
                                <p className="text-sm font-semibold text-white">Method</p>
                                <p className="text-xs text-white/50 mt-0.5">How do you want to add it?</p>
                            </div>
                            <div className="p-2">
                                {OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const active = selected === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleSelect(opt.id)}
                                            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                                                active ? 'bg-light-green/10' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                                active ? 'bg-light-green' : 'bg-gray-100'
                                            }`}>
                                                <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-steel'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium leading-tight ${active ? 'text-light-green' : 'text-cast-iron'}`}>
                                                    {opt.title}
                                                </p>
                                                <p className="text-xs text-steel/50 truncate">{opt.subtitle}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Form panel */}
                    <div className={`flex-1 min-w-0 ${mobileView === 'options' ? 'hidden lg:block' : 'block'}`}>

                        {/* Mobile back button */}
                        <button
                            onClick={() => setMobileView('options')}
                            className="lg:hidden mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors"
                        >
                            <FiArrowLeft className="w-4 h-4" />
                            Back to options
                        </button>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selected}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18 }}
                            >
                                <FormPanel id={selected} />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
}
