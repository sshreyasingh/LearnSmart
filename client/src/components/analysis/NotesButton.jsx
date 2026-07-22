import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotes, saveNotes } from '../../api/analysis.api';
import { Modal } from '../common/Modal';

export function NotesButton({ projectId }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const saveTimer = useRef(null);

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
    if (!open && notes !== saved) {
      doSave(notes);
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2 shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Notes
        {saved?.length > 0 && (
          <span className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full font-semibold">
            {saved.length > 80 ? '✓' : saved.length}
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Analysis Notes"
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="btn-ghost px-5 py-2"
            >
              Done
            </button>
            <button
              onClick={() => {
                if (saveTimer.current) clearTimeout(saveTimer.current);
                doSave(notes);
              }}
              disabled={saving}
              className="btn-primary px-5 py-2 text-sm"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="flex items-center gap-3 mb-4">
          {status && (
            <span className={`text-xs font-semibold ${status === 'Saved' ? 'text-emerald-600' : 'text-red-500'}`}>
              {status}
            </span>
          )}
          {saving && <span className="text-xs text-surface-400">Saving...</span>}
        </div>
        <textarea
          value={notes}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write your analysis notes here…&#10;&#10;• Key observations&#10;• Things to remember&#10;• Questions to follow up on&#10;&#10;Ctrl+S to save immediately"
          className="w-full h-[300px] px-0 py-0 text-sm text-surface-700 resize-none outline-none placeholder:text-surface-300 scrollbar-thin"
        />
        <p className="text-[10px] text-surface-400 mt-3">Auto-saves as you type · Ctrl+S to force save</p>
      </Modal>
    </>
  );
}
