import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mealService } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import { staggerContainer, popIn, fadeUp } from '../utils/motionPresets';

const MEAL_CATEGORIES = [
  { id: 'BREAKFAST', icon: 'wb_sunny' },
  { id: 'LUNCH', icon: 'lunch_dining' },
  { id: 'DINNER', icon: 'dinner_dining' },
  { id: 'SNACK', icon: 'cookie' },
  { id: 'OTHER', icon: 'more_horiz' },
];

const panelTransition = { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] };

export default function MealEntry() {
  const { t } = useLang();
  const funnyMessages = t('mealEntry.funny');

  const [step, setStep] = useState(0); // 0: Category, 1: Method/Input
  const [selectedType, setSelectedType] = useState(null);
  const [inputMethod, setInputMethod] = useState(null); // 'TEXT', 'CAM'

  const [textInput, setTextInput] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Cycle funny messages while loading
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % funnyMessages.length);
      }, 2500);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading, funnyMessages.length]);

  const handleCategorySelect = (type) => {
    setSelectedType(type);
    setStep(1);
  };

  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setInputMethod('CAM');
    }
  };

  const getErrorMessage = (err) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;

    if (status === 503) {
      return t('mealEntry.errBusy');
    } else if (status === 500) {
      return detail || t('mealEntry.errGeneric');
    } else {
      return detail || t('mealEntry.errGeneric');
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError(t('mealEntry.errEmpty'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mealService.processText(textInput, selectedType);
      navigate('/summary', { state: { meal: response } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImageSubmit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');

    try {
      const response = await mealService.processImage(selectedFile, selectedType, mealDescription);
      navigate('/summary', { state: { meal: response } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setSelectedType(null);
    setInputMethod(null);
    setTextInput('');
    setMealDescription('');
    setSelectedFile(null);
    setImagePreview(null);
    setError('');
  };

  // Identifies which panel is showing so AnimatePresence can cross-fade them.
  const viewKey = step === 0 ? 'category' : (inputMethod || 'method');

  return (
    <div className="relative min-h-full">
      <div className="space-y-8">
        {/* Header with Back Button */}
        <section className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-1 font-headline uppercase italic truncate">
              {step === 0 ? t('mealEntry.logMeal') : t(`mealType.${selectedType}`)}
            </h2>
            <p className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
              {step === 0 ? t('mealEntry.selectCategory') : t('mealEntry.chooseInput')}
            </p>
          </div>
          {step > 0 && (
            <motion.button whileTap={{ scale: 0.92, rotate: -90 }} onClick={reset} className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shrink-0">
              <span className="material-symbols-outlined">restart_alt</span>
            </motion.button>
          )}
        </section>

        <AnimatePresence mode="wait">
          {/* Step 0: Category Selection */}
          {step === 0 && (
            <motion.div
              key="category"
              variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: panelTransition }}
              className="grid grid-cols-2 gap-3 sm:gap-4"
            >
              {MEAL_CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.id}
                  variants={popIn}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCategorySelect(cat.id)}
                  className="group flex flex-col items-center justify-center bg-white high-contrast-border neo-shadow aspect-square transition-colors hover:bg-black hover:text-white"
                >
                  <span className="material-symbols-outlined text-4xl mb-4">{cat.icon}</span>
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase text-center px-2">{t(`mealType.${cat.id}`)}</span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Step 1: Input Method Choice */}
          {step === 1 && !inputMethod && (
            <motion.div
              key="method"
              variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: panelTransition }}
              className="grid grid-cols-2 gap-3 sm:gap-4"
            >
              <motion.button
                variants={popIn}
                whileTap={{ scale: 0.95 }}
                onClick={() => setInputMethod('TEXT')}
                className="group flex flex-col items-center justify-center bg-white high-contrast-border neo-shadow aspect-square transition-colors hover:bg-black hover:text-white"
              >
                <span className="material-symbols-outlined text-4xl mb-4">edit_note</span>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase">{t('mealEntry.describe')}</span>
              </motion.button>

              <motion.button
                variants={popIn}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current.click()}
                className="group flex flex-col items-center justify-center bg-white high-contrast-border neo-shadow aspect-square transition-colors hover:bg-black hover:text-white"
              >
                <span className="material-symbols-outlined text-4xl mb-4">photo_camera</span>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase">{t('mealEntry.photo')}</span>
              </motion.button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelection} accept="image/jpeg, image/png, image/webp" className="hidden" />
            </motion.div>
          )}

          {/* Text Input State */}
          {step === 1 && inputMethod === 'TEXT' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: panelTransition }} exit={{ opacity: 0, y: -8, transition: panelTransition }}
              className="space-y-6"
            >
              <div className="high-contrast-border neo-shadow bg-[#f0f5f1] p-6 relative">
                <textarea
                  className="w-full h-48 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 resize-none font-body leading-relaxed text-lg font-medium outline-none"
                  placeholder={t('mealEntry.placeholderText')}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  autoFocus
                />
                <div className="absolute bottom-4 right-4 pointer-events-none">
                  <span className="material-symbols-outlined text-black/20 text-4xl">edit_note</span>
                </div>
              </div>

              {error && <div className="text-error font-bold text-[10px] uppercase tracking-widest">{error}</div>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleTextSubmit}
                disabled={loading}
                className="w-full bg-secondary text-white py-5 px-6 high-contrast-border font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-opacity-90 transition-colors neo-shadow"
              >
                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                  {loading ? 'progress_activity' : 'auto_awesome'}
                </span>
                {loading ? funnyMessages[loadingTextIndex] : t('mealEntry.processText')}
              </motion.button>
            </motion.div>
          )}

          {/* Cam Input State (with Description) */}
          {step === 1 && inputMethod === 'CAM' && (
            <motion.div
              key="cam"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: panelTransition }} exit={{ opacity: 0, y: -8, transition: panelTransition }}
              className="space-y-6"
            >
              {imagePreview && (
                <div className="high-contrast-border neo-shadow bg-black aspect-video overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-90" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  {t('mealEntry.portionNotes')}
                </label>
                <div className="high-contrast-border neo-shadow bg-[#f0f5f1] p-4 relative">
                  <textarea
                    className="w-full h-24 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 resize-none font-body leading-tight text-sm font-medium outline-none"
                    placeholder={t('mealEntry.placeholderNotes')}
                    value={mealDescription}
                    onChange={(e) => setMealDescription(e.target.value)}
                  />
                </div>
              </div>

              {error && <div className="text-error font-bold text-[10px] uppercase tracking-widest">{error}</div>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleImageSubmit}
                disabled={loading}
                className="w-full bg-secondary text-white py-5 px-6 high-contrast-border font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-opacity-90 transition-colors neo-shadow"
              >
                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                  {loading ? 'progress_activity' : 'auto_awesome'}
                </span>
                {loading ? funnyMessages[loadingTextIndex] : t('mealEntry.submitPhoto')}
              </motion.button>

              <button
                onClick={() => { setSelectedFile(null); setImagePreview(null); setInputMethod(null); }}
                className="w-full text-[10px] font-black uppercase tracking-[0.2em] py-2 opacity-60 hover:opacity-100"
              >
                {t('mealEntry.changeMethod')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="p-6 bg-black text-white font-bold tracking-widest text-xs uppercase shadow-2xl flex items-center gap-3 border-2 border-white text-center"
            >
              <span className="material-symbols-outlined animate-spin shrink-0">progress_activity</span>
              {funnyMessages[loadingTextIndex]}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
