import { useState, useCallback } from 'react';
import { CheckCircle2, Circle, Plus, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PetCareTask {
  id: string;
  petId?: string;
  title: string;
  assignedTo: string; // uid
  assignedName: string;
  dueDate?: string;
  status: 'pending' | 'completed';
  createdAt: number;
}

const STORAGE_KEY = (householdId: string) => `petbase-tasks-${householdId}`;

function loadTasks(householdId: string): PetCareTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(householdId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTasks(householdId: string, tasks: PetCareTask[]) {
  localStorage.setItem(STORAGE_KEY(householdId), JSON.stringify(tasks));
}

interface Props {
  householdId: string;
  members: Array<{ uid: string; displayName: string }>;
  currentUid: string;
}

export function PetCareTaskList({ householdId, members, currentUid }: Props) {
  const [tasks, setTasks] = useState<PetCareTask[]>(() => loadTasks(householdId));
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(currentUid);
  const [dueDate, setDueDate] = useState('');

  const addTask = useCallback(() => {
    if (!title.trim()) return;
    const member = members.find(m => m.uid === assignee);
    const task: PetCareTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      assignedTo: assignee,
      assignedName: member?.displayName ?? 'Unknown',
      dueDate: dueDate || undefined,
      status: 'pending',
      createdAt: Date.now(),
    };
    const updated = [task, ...tasks];
    setTasks(updated);
    saveTasks(householdId, updated);
    setTitle('');
    setDueDate('');
    setShowAdd(false);
  }, [title, assignee, dueDate, tasks, householdId, members]);

  const toggleTask = (taskId: string) => {
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, status: t.status === 'pending' ? 'completed' as const : 'pending' as const } : t
    );
    setTasks(updated);
    saveTasks(householdId, updated);
  };

  const deleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    saveTasks(householdId, updated);
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed').slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Pet Care Tasks</h3>
        <button onClick={() => setShowAdd(v => !v)}
          className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-xl space-y-2">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Walk the dog, give meds..."
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100" />
              <div className="grid grid-cols-2 gap-2">
                <select value={assignee} onChange={e => setAssignee(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100">
                  {members.map(m => <option key={m.uid} value={m.uid}>{m.displayName}</option>)}
                </select>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100" />
              </div>
              <button onClick={addTask} disabled={!title.trim()}
                className="w-full py-1.5 text-xs bg-emerald-600 text-white rounded-lg disabled:opacity-40">Add Task</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingTasks.length === 0 && !showAdd && (
        <p className="text-xs text-neutral-400 text-center py-2">No pending tasks</p>
      )}

      <div className="space-y-1">
        {pendingTasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/30 group">
            <button onClick={() => toggleTask(t.id)} className="shrink-0 text-neutral-300 hover:text-emerald-500">
              <Circle className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{t.title}</p>
              <p className="text-[10px] text-neutral-400">
                {t.assignedName}{t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </p>
            </div>
            <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {completedTasks.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-700">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Completed</p>
          {completedTasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-1.5 opacity-60">
              <button onClick={() => toggleTask(t.id)} className="shrink-0 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <p className="text-xs text-neutral-500 line-through truncate">{t.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
