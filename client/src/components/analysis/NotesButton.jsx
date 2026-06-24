import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotes, saveNotes } from '../../api/analysis.api';

export function NotesButton({ projectId }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const saveTimer = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      getNotes(projectId)
        .then((res) => {
          const n = res.data.data.notes || '';
          setNotes(n);
          setSaved(n);
        })
        .catch(() => {});
    }
  }, [open, projectId]);

  const doSave = useCallback((value) => {
    setSaving(true);
    setStatus('');
    saveNotes(projectId, value)
      .then(() => {
        setSaved(value);
        setStatus('Saved');
        setTimeout(() => setStatus(''), 2000);
      })
      .catch(() => setStatus('Failed to save'))
      .finally(() => setSaving(false));
  }, [projectId]);

  const handleChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(value), 1000);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      doSave(notes);
    }
  };

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (notes !== saved) {
        doSave(notes);
      }
    }
  }, [open]);

  const hasUnsaved = notes !== saved;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9EDDC] border border-emerald-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-[#bde8d4] hover:border-emerald-300 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Notes
        {saved && saved.length > 0 && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
            {saved.length > 80 ? '✓' : `${saved.length}`}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">Analysis Notes</h3>
              </div>
              <div className="flex items-center gap-3">
                {status && (
                  <span className={`text-xs font-medium ${status === 'Saved' ? 'text-green-600' : 'text-red-500'}`}>
                    {status}
                  </span>
                )}
                {saving && (
                  <span className="text-xs text-gray-400">Saving...</span>
                )}
                {hasUnsaved && !saving && (
                  <span className="text-xs text-amber-500">Unsaved changes</span>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Write your analysis notes here…&#10;&#10;• Key observations&#10;• Things to remember&#10;• Questions to follow up on&#10;&#10;Ctrl+S to save immediately"
                className="w-full h-full min-h-[300px] px-6 py-4 text-sm text-gray-700 resize-none outline-none placeholder:text-gray-300"
              />
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Auto-saves as you type · Ctrl+S to force save · Notes stay with this report</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    doSave(notes);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
