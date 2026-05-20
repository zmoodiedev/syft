'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import RecipeForm from '@/app/components/RecipeForm';
import UrlInput from '@/app/components/UrlInput';
import BulkEntryForm from '@/app/components/BulkEntryForm';
import UpgradeModal from '@/app/components/UpgradeModal';
import { FiArrowLeft, FiFileText, FiGlobe, FiCamera, FiList } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserRecipeCount } from '@/app/lib/recipe';
import { TIER_FEATURES } from '@/app/lib/tiers';

type OptionId = 'url' | 'scan' | 'bulk' | 'manual';

const OPTIONS: { id: OptionId; icon: React.ElementType; title: string; subtitle: string }[] = [
    { id: 'url',    icon: FiGlobe,    title: 'Import from URL',   subtitle: 'Paste any recipe link'   },
    { id: 'scan',   icon: FiCamera,   title: 'Scan a recipe',     subtitle: 'Upload a photo'           },
    { id: 'bulk',   icon: FiList,     title: 'Bulk entry',        subtitle: 'Copy and paste text'      },
    { id: 'manual', icon: FiFileText, title: 'Manual entry',      subtitle: 'Start from scratch'       },
];

// Parse a TikTok caption into separate ingredients and instructions blocks.
// Many recipe creators use headings like "Ingredients:" and "Steps:" in their captions.
function parseTikTokCaption(text: string): { ingredients: string; instructions: string } {
    const normalized = text.replace(/\r\n/g, '\n').trim();

    const ingredientsMatch = normalized.match(
        /(?:^|\n)[ \t]*(?:ingredients?|what you[''\u2019]?ll need)[ \t]*:?[ \t]*\n([\s\S]*?)(?=\n[ \t]*(?:directions?|steps?|instructions?|method|how to(?:\s+make)?|to\s+make)[ \t]*:?[ \t]*\n|$)/i
    );
    const instructionsMatch = normalized.match(
        /(?:^|\n)[ \t]*(?:directions?|steps?|instructions?|method|how to(?:\s+make)?|to\s+make)[ \t]*:?[ \t]*\n([\s\S]*?)(?=\n[ \t]*(?:ingredients?)[ \t]*:?[ \t]*\n|$)/i
    );

    if (ingredientsMatch || instructionsMatch) {
        return {
            ingredients: ingredientsMatch ? ingredientsMatch[1].trim() : '',
            instructions: instructionsMatch ? instructionsMatch[1].trim() : '',
        };
    }

    // No clear sections — drop everything into instructions for the user to sort out
    return { ingredients: '', instructions: normalized };
}

interface ShareData {
    title: string;
    ingredients: string;
    instructions: string;
    sourceUrl: string;
    hasContent: boolean;
    urlToImport?: string;
}

function FormPanel({ id, shareData }: { id: OptionId; shareData?: ShareData }) {
    if (id === 'url')  return <UrlInput initialUrl={shareData?.urlToImport} autoSubmit={!!shareData?.urlToImport} />;
    if (id === 'scan') return <RecipeForm scanMode={true} />;
    if (id === 'bulk') {
        return (
            <BulkEntryForm
                initialTitle={shareData?.title}
                initialIngredients={shareData?.ingredients}
                initialInstructions={shareData?.instructions}
                initialSourceUrl={shareData?.sourceUrl}
            />
        );
    }
    return <RecipeForm />;
}

function AddRecipeContent() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selected, setSelected] = useState<OptionId>('url');
    const [mobileView, setMobileView] = useState<'options' | 'form'>('options');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [shareData, setShareData] = useState<ShareData | undefined>(undefined);

    useEffect(() => {
        if (!user || userProfile?.tier !== 'Free') return;
        getUserRecipeCount(user.uid).then(count => {
            if (count >= TIER_FEATURES['Free'].maxRecipes) {
                setShowUpgradeModal(true);
            }
        });
    }, [user, userProfile]);

    // Handle Web Share Target — reads params injected by the OS share sheet
    useEffect(() => {
        const rawText = searchParams.get('text') || '';
        const rawUrl  = searchParams.get('url')  || '';
        const rawTitle = searchParams.get('title') || '';

        if (!rawText && !rawUrl) return;

        const cleanTitle = rawTitle && !rawTitle.toLowerCase().includes('tiktok') ? rawTitle : '';

        const isTikTokUrl = (u: string) => /tiktok\.com/i.test(u);

        // rawText is sometimes just a bare URL (some apps), sometimes "Check out ... https://..."
        const isJustUrl = /^https?:\/\/\S+$/.test(rawText.trim());
        // Pull out any URL embedded in rawText (strips trailing punctuation)
        const urlInText = rawText.match(/https?:\/\/\S+/)?.[0]?.replace(/[.,;!?]+$/, '') ?? '';

        // Pick the best URL to import. Priority:
        // 1. rawText is a bare URL
        // 2. rawUrl is a TikTok URL (most reliable when present)
        // 3. A TikTok URL embedded inside rawText (e.g. "Check out this video! https://...")
        // 4. rawUrl when there is no text at all
        const urlToImport =
            isJustUrl              ? rawText.trim() :
            isTikTokUrl(rawUrl)    ? rawUrl :
            isTikTokUrl(urlInText) ? urlInText :
            (rawUrl && !rawText)   ? rawUrl :
            undefined;

        if (urlToImport) {
            setShareData({
                title: cleanTitle,
                ingredients: '',
                instructions: '',
                sourceUrl: urlToImport,
                hasContent: true,
                urlToImport,
            });
            setSelected('url');
            setMobileView('form');
            return;
        }

        const parsed = parseTikTokCaption(rawText);
        setShareData({
            title: cleanTitle,
            ingredients: parsed.ingredients,
            instructions: parsed.instructions,
            sourceUrl: rawUrl,
            hasContent: !!(rawText || rawUrl),
        });
        setSelected('bulk');
        setMobileView('form');
    }, [searchParams]);

    const handleSelect = (id: OptionId) => {
        setSelected(id);
        setMobileView('form');
    };

    return (
        <>
        <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => { setShowUpgradeModal(false); router.push('/recipes'); }}
            reason="recipe_limit"
        />
        <div className="min-h-screen bg-eggshell">
            <div className="container mx-auto px-4 sm:px-6 py-10 md:py-14">

                {/* TikTok share banner */}
                {shareData?.hasContent && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 flex items-start gap-3 bg-light-green/10 border border-light-green/20 rounded-2xl px-5 py-4"
                    >
                        <span className="text-xl leading-none mt-0.5">🎵</span>
                        <div>
                            <p className="text-sm font-semibold text-cast-iron">Shared from TikTok</p>
                            <p className="text-sm text-steel mt-0.5">
                                {shareData.urlToImport
                                    ? "Importing the recipe from the video now."
                                    : shareData.ingredients || shareData.instructions
                                    ? "We parsed what we could from the caption. Review the fields below and add a name before saving."
                                    : "Paste the recipe from the video caption into the fields below, then click Import to Recipe."}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-cast-iron">Add a recipe</h1>
                    <p className="text-sm text-steel mt-1">Choose how you want to add it.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Sidebar */}
                    <div className={`w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-8 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
                        <p className="text-xs font-semibold text-steel/50 uppercase tracking-wider mb-3 px-1">Method</p>
                        <div className="flex flex-col gap-1">
                            {OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const active = selected === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelect(opt.id)}
                                        className={`w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors ${
                                            active
                                                ? 'bg-white border border-stone-100 shadow-sm'
                                                : 'hover:bg-white/60 border border-transparent'
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                            active ? 'bg-light-green' : 'bg-stone-100'
                                        }`}>
                                            <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-steel'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold leading-tight transition-colors ${active ? 'text-cast-iron' : 'text-steel'}`}>
                                                {opt.title}
                                            </p>
                                            <p className="text-xs text-steel/50 truncate mt-0.5">{opt.subtitle}</p>
                                        </div>
                                    </button>
                                );
                            })}
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
                                <FormPanel id={selected} shareData={shareData} />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
        </>
    );
}

export default function AddRecipe() {
    return (
        <Suspense>
            <AddRecipeContent />
        </Suspense>
    );
}
