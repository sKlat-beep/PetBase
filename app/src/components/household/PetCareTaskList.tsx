import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

interface Props {
  householdId: string;
  members: Array<{ uid: string; displayName: string }>;
  currentUid: string;
}

export function PetCareTaskList({ householdId, members, currentUid }: Props) {
  const [tasks, setTasks] = useState<PetCareTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(currentUid);
  const [dueDate, setDueDate] = useState('');

  // Real-time listener on Firestore tasks subcollection
  useEffect(() => {
    const q = query(collection(db, 'households', householdId, 'tasks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as PetCareTask));
    }, () => { /* ignore snapshot errors */ });
    return unsub;
  }, [householdId]);

  const addTask = useCallback(async () => {
    if (!title.trim()) return;
    const member = members.find(m => m.uid === assignee);
    const taskId = crypto.randomUUID();
    const task: PetCareTask = {
      id: taskId,
      title: title.trim(),
      assignedTo: assignee,
      assignedName: member?.displayName ?? 'Unknown',
      dueDate: dueDate || undefined,
      status: 'pending',
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'households', householdId, 'tasks', taskId), task);
    setTitle('');
    setDueDate('');
    setShowAdd(false);
  }, [title, assignee, dueDate, householdId, members]);

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateDoc(doc(db, 'households', householdId, 'tasks', taskId), {
      status: task.status === 'pending' ? 'completed' : 'pending',
    });
  };

  const removeTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'households', householdId, 'tasks', taskId));
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed').slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Pet Care Tasks</h3>
        <button onClick={() => setShowAdd(v => !v)}
          className="p-1 rounded-lg text-primary hover:bg-primary-container/30"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 bg-surface-container rounded-xl space-y-2">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Walk the dog, give meds..."
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
              <div className="grid grid-cols-2 gap-2">
                <select value={assignee} onChange={e => setAssignee(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface">
                  {members.map(m => <option key={m.uid} value={m.uid}>{m.displayName}</option>)}
                </select>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
              </div>
              <button onClick={addTask} disabled={!title.trim()}
                className="w-full py-1.5 text-xs bg-primary text-on-primary rounded-lg disabled:opacity-40">Add Task</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingTasks.length === 0 && !showAdd && (
        <p className="text-xs text-on-surface-variant text-center py-2">No pending tasks</p>
      )}

      <div className="space-y-1">
        {pendingTasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container group">
            <button onClick={() => toggleTask(t.id)} className="shrink-0 text-outline-variant hover:text-primary">
              <span className="material-symbols-outlined text-[16px]">radio_button_unchecked</span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface truncate">{t.title}</p>
              <p className="text-xs text-on-surface-variant">
                {t.assignedName}{t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </p>
            </div>
            <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {completedTasks.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">Completed</p>
          {completedTasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-1.5 opacity-60">
              <button onClick={() => toggleTask(t.id)} className="shrink-0 text-primary">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </button>
              <p className="text-xs text-on-surface-variant line-through truncate">{t.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
