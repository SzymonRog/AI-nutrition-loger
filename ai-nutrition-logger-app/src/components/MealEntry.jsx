import { useState, useRef, useEffect } from 'react';
import { mealService } from '../api/client';
import { useNavigate } from 'react-router-dom';

const FUNNY_MESSAGES = [
  "Crunching the numbers...",
  "You really ate that much? 🤨",
  "That sounds delicious 🤤",
  "Consulting the AI dietary gods...",
  "Wait, let me double check...",
  "Judging your life choices...",
  "Math is hard, give me a sec..."
];

const MEAL_CATEGORIES = [
  { id: 'BREAKFAST', label: 'Breakfast', icon: 'wb_sunny' },
  { id: 'LUNCH', label: 'Lunch', icon: 'lunch_dining' },
  { id: 'DINNER', label: 'Dinner', icon: 'dinner_dining' },
  { id: 'SNACK', label: 'Snack', icon: 'cookie' },
  { id: 'OTHER', label: 'Other', icon: 'more_horiz' },
];

export default function MealEntry() {
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
        setLoadingTextIndex(prev => (prev + 1) % FUNNY_MESSAGES.length);
      }, 2500);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

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
      return 'AI model is currently busy. Please try again later.';
    } else if (status === 500) {
      return detail || 'An error occurred while processing your meal. Please try again.';
    } else {
      return detail || 'Failed to analyze meal. Please try again.';
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError('Please describe your meal.');
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

  return (
    <div className="relative min-h-full">
      <div className="space-y-8">
        {/* Header with Back Button */}
        <section className="flex items-start justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-tighter mb-1 font-headline uppercase italic">
              {step === 0 ? "Log Meal" : selectedType}
            </h2>
            <p className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
              {step === 0 ? "Select category first" : "Choose input method"}
            </p>
          </div>
          {step > 0 && (
            <button onClick={reset} className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors">
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          )}
        </section>

        {/* Step 0: Category Selection */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            {MEAL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="group flex flex-col items-center justify-center bg-white high-contrast-border neo-shadow aspect-square transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <span className="material-symbols-outlined text-4xl mb-4">{cat.icon}</span>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Input Method Choice */}
        {step === 1 && !inputMethod && (
          <div className="grid grid-cols-2 gap-4 scale-in-center">
            <button
              onClick={() => setInputMethod('TEXT')}
              className="group flex flex-col items-center justify-center bg-white high-contrast-border neo-shadow aspect-square transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="material-symbols-outlined text-4xl mb-4">edit_note</span>
              <span className="text-[10px] font-black tracking-[0.3em] uppercase">Describe</span>
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              className="group flex flex-col items-center justify-center bg-white high-contrast-border neo-shadow aspect-square transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="material-symbols-outlined text-4xl mb-4">photo_camera</span>
              <span className="text-[10px] font-black tracking-[0.3em] uppercase">Photo</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelection} accept="image/jpeg, image/png, image/webp" className="hidden" />
          </div>
        )}

        {/* Text Input State */}
        {step === 1 && inputMethod === 'TEXT' && (
          <div className="space-y-6 scale-in-center">
            <div className="high-contrast-border neo-shadow bg-[#f0f5f1] p-6 relative">
              <textarea
                className="w-full h-48 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 resize-none font-body leading-relaxed text-lg font-medium outline-none"
                placeholder="E.g., 3 eggs and one avocado"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
              />
              <div className="absolute bottom-4 right-4 pointer-events-none">
                <span className="material-symbols-outlined text-black/20 text-4xl">edit_note</span>
              </div>
            </div>

            {error && <div className="text-error font-bold text-[10px] uppercase tracking-widest">{error}</div>}

            <button
              onClick={handleTextSubmit}
              disabled={loading}
              className="w-full bg-secondary text-white py-5 px-6 high-contrast-border font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all neo-shadow"
            >
              <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'progress_activity' : 'auto_awesome'}
              </span>
              {loading ? FUNNY_MESSAGES[loadingTextIndex] : 'Process Text'}
            </button>
          </div>
        )}

        {/* Cam Input State (with Description) */}
        {step === 1 && inputMethod === 'CAM' && (
          <div className="space-y-6 scale-in-center">
            {imagePreview && (
              <div className="high-contrast-border neo-shadow bg-black aspect-video overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-90" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                Portion Notes / Corrections (Optional)
              </label>
              <div className="high-contrast-border neo-shadow bg-[#f0f5f1] p-4 relative">
                <textarea
                  className="w-full h-24 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 resize-none font-body leading-tight text-sm font-medium outline-none"
                  placeholder="E.g., Large portion of rice, extra butter on the side..."
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="text-error font-bold text-[10px] uppercase tracking-widest">{error}</div>}

            <button
              onClick={handleImageSubmit}
              disabled={loading}
              className="w-full bg-secondary text-white py-5 px-6 high-contrast-border font-headline font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all neo-shadow"
            >
              <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'progress_activity' : 'auto_awesome'}
              </span>
              {loading ? FUNNY_MESSAGES[loadingTextIndex] : 'Submit Photo'}
            </button>

            <button
              onClick={() => { setSelectedFile(null); setImagePreview(null); setInputMethod(null); }}
              className="w-full text-[10px] font-black uppercase tracking-[0.2em] py-2 opacity-60 hover:opacity-100"
            >
              Change Method
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="p-6 bg-black text-white font-bold tracking-widest text-xs uppercase shadow-2xl flex items-center gap-3 border-2 border-white">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            {FUNNY_MESSAGES[loadingTextIndex]}
          </div>
        </div>
      )}
    </div>
  );
}
