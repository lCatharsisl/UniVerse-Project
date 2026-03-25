import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPercent, FiPlus, FiTrash2, FiSave, FiFolder, FiX, FiArrowLeft } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

export interface GradeComponent {
  id: string;
  label: string;
  weightPercent: number;
  score: string; // empty = not entered
}

export interface SavedGradeSetup {
  id: string;
  name: string;
  passingGrade: number;
  components: GradeComponent[];
  savedAt: number;
}

const newComponent = (): GradeComponent => ({
  id: crypto.randomUUID(),
  label: '',
  weightPercent: 0,
  score: '',
});

const STORAGE_KEY = 'universe-grade-calculator-saved';

function loadSaved(): SavedGradeSetup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSaved(list: SavedGradeSetup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const GradeCalculator: React.FC = () => {
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [passingGrade, setPassingGrade] = useState<string>('60');
  const [components, setComponents] = useState<GradeComponent[]>(() => [
    { ...newComponent(), label: 'Midterm 1', weightPercent: 30, score: '' },
    { ...newComponent(), label: 'Midterm 2', weightPercent: 30, score: '' },
    { ...newComponent(), label: 'Final', weightPercent: 40, score: '' },
  ]);
  const [savedList, setSavedList] = useState<SavedGradeSetup[]>(loadSaved);
  const [showSaved, setShowSaved] = useState(false);

  const addComponent = useCallback(() => {
    setComponents((prev) => [...prev, newComponent()]);
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  }, []);

  const updateComponent = useCallback((id: string, updates: Partial<GradeComponent>) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const totalWeight = components.reduce((s, c) => s + (Number.isNaN(c.weightPercent) ? 0 : c.weightPercent), 0);
  const passing = Number(passingGrade);
  const validPassing = !Number.isNaN(passing) && passing >= 0 && passing <= 100;

  const weightedSum = components.reduce((s, c) => {
    const score = parseFloat(c.score);
    const w = Number.isNaN(c.weightPercent) ? 0 : c.weightPercent;
    return s + (Number.isNaN(score) ? 0 : (score * w) / 100);
  }, 0);

  const getMinNeededFor = useCallback(
    (index: number): number | null => {
      const w = components[index].weightPercent;
      if (Number.isNaN(w) || w <= 0) return null;
      const otherSum = components.reduce((s, c, i) => {
        if (i === index) return s;
        const score = parseFloat(c.score);
        const ww = Number.isNaN(c.weightPercent) ? 0 : c.weightPercent;
        return s + (Number.isNaN(score) ? 0 : (score * ww) / 100);
      }, 0);
      const min = ((passing - otherSum) * 100) / w;
      return min;
    },
    [components, passing]
  );

  const handleSave = () => {
    const name = prompt('Name this setup (e.g. course code):')?.trim();
    if (!name) return;
    const entry: SavedGradeSetup = {
      id: crypto.randomUUID(),
      name,
      passingGrade: validPassing ? passing : 60,
      components: components.map((c) => ({ ...c })),
      savedAt: Date.now(),
    };
    const next = [entry, ...savedList];
    setSavedList(next);
    saveSaved(next);
    setShowSaved(false);
  };

  const handleLoad = (entry: SavedGradeSetup) => {
    setPassingGrade(String(entry.passingGrade));
    setComponents(
      entry.components.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
      }))
    );
    setShowSaved(false);
  };

  const handleDeleteSaved = (id: string) => {
    const next = savedList.filter((e) => e.id !== id);
    setSavedList(next);
    saveSaved(next);
  };

  const bgPage = isSpace ? 'bg-[#050510]' : 'bg-white';
  const cardBg = isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border';
  const textPrimary = isSpace ? 'text-[#e1e1e6]' : 'text-uv-black';
  const textMuted = isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray';
  const inputBg = isSpace ? 'bg-white/10 border-white/20 text-white placeholder-white/40' : 'bg-gray-50 border-uv-border text-uv-black';
  const borderRow = isSpace ? 'border-white/10' : 'border-uv-border';

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-500 ${bgPage} selection:bg-primary selection:text-white`}>
      {/* Header */}
      <div
        className={`flex-shrink-0 sticky top-0 backdrop-blur-xl border-b z-30 px-6 py-5 ${
          isSpace ? 'bg-[#0a0a1a]/80 border-white/5' : 'bg-white/90 border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-xl ${isSpace ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              aria-label="Go back"
            >
              <FiArrowLeft size={22} className={textPrimary} />
            </button>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${
                isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-uv-black'
              }`}
            >
              <FiPercent size={24} className="text-primary" />
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tighter leading-none ${textPrimary}`}>
                Grade Calculator
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${textMuted}`}>
                Min grade needed per component
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaved((s) => !s)}
              className={`uv-button flex items-center gap-2 ${isSpace ? 'bg-primary/30 text-white' : ''}`}
            >
              <FiFolder size={16} /> Saved
            </button>
            <button onClick={handleSave} className="uv-button flex items-center gap-2">
              <FiSave size={16} /> Save
            </button>
          </div>
        </div>
      </div>

      {/* Saved list overlay */}
      {showSaved && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowSaved(false)}>
          <div
            className={`uv-card max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col ${cardBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${borderRow} flex justify-between items-center`}>
              <h3 className={`font-black uppercase tracking-widest ${textPrimary}`}>Saved setups</h3>
              <button onClick={() => setShowSaved(false)} className="p-2 rounded-lg hover:opacity-80">
                <FiX className={textPrimary} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {savedList.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No saved setups yet. Save current to see them here.</p>
              ) : (
                savedList.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${borderRow} ${cardBg}`}
                  >
                    <div>
                      <p className={`font-bold ${textPrimary}`}>{entry.name}</p>
                      <p className={`text-xs ${textMuted}`}>
                        Pass ≥ {entry.passingGrade} · {entry.components.length} components
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoad(entry)}
                        className="text-primary font-bold text-sm hover:underline"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(entry.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-500"
                        aria-label="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Passing grade */}
        <div className={`uv-card p-4 ${cardBg}`}>
          <label className={`block text-xs font-black uppercase tracking-widest ${textMuted} mb-2`}>
            Passing grade (0–100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={passingGrade}
            onChange={(e) => setPassingGrade(e.target.value)}
            className={`w-24 px-3 py-2 rounded-xl border ${inputBg} font-bold`}
          />
        </div>

        {/* Components */}
        <div className={`uv-card overflow-hidden ${cardBg}`}>
          <div className={`p-4 border-b ${borderRow} flex justify-between items-center flex-wrap gap-2`}>
            <h3 className={`font-black uppercase tracking-widest ${textPrimary}`}>Components (weights must sum to 100)</h3>
            <button
              onClick={addComponent}
              className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"
            >
              <FiPlus size={16} /> Add component
            </button>
          </div>
          {totalWeight !== 100 && (
            <div className={`px-4 py-2 text-sm ${totalWeight > 100 ? 'text-red-500' : textMuted}`}>
              Weights sum to {totalWeight}%. {totalWeight > 100 ? 'Reduce some weights.' : 'Add more to reach 100%.'}
            </div>
          )}
          <div className={`divide-y ${isSpace ? 'divide-white/10' : 'divide-uv-border'}`}>
            {components.map((c, index) => (
              <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Label (e.g. Quiz 1)"
                  value={c.label}
                  onChange={(e) => updateComponent(c.id, { label: e.target.value })}
                  className={`flex-1 min-w-[120px] px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={c.weightPercent || ''}
                    onChange={(e) => updateComponent(c.id, { weightPercent: parseFloat(e.target.value) || 0 })}
                    placeholder="%"
                    className={`w-16 px-2 py-2 rounded-lg border ${inputBg} text-sm text-right`}
                  />
                  <span className={textMuted}>%</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={c.score}
                  onChange={(e) => updateComponent(c.id, { score: e.target.value })}
                  placeholder="Score"
                  className={`w-20 px-2 py-2 rounded-lg border ${inputBg} text-sm text-right`}
                />
                {(() => {
                  const minVal = getMinNeededFor(index);
                  const num = minVal === null ? null : Math.round(minVal * 100) / 100;
                  return (
                    <span className={`text-sm font-bold min-w-[100px] ${num !== null && num <= 100 && num >= 0 ? 'text-emerald-600' : num !== null && num < 0 ? 'text-emerald-600' : 'text-uv-gray'}`}>
                      {num === null ? '—' : num < 0 ? 'Min: 0 (already enough)' : num > 100 ? `Min: ${num} (impossible)` : `Min: ${num}`}
                    </span>
                  );
                })()}
                <button
                  onClick={() => removeComponent(c.id)}
                  disabled={components.length <= 1}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove component"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className={`uv-card p-4 ${cardBg}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${textMuted} mb-2`}>Weighted average</h3>
          <p className={`text-2xl font-black ${textPrimary}`}>
            {Number.isNaN(weightedSum) ? '—' : weightedSum.toFixed(2)}
            {validPassing && (
              <span className={`text-sm font-bold ml-2 ${weightedSum >= passing ? 'text-emerald-600' : 'text-red-500'}`}>
                {weightedSum >= passing ? 'Pass' : 'Fail'}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GradeCalculator;
