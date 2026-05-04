'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  loadAlarmRules,
  createAlarmRule,
  updateAlarmRule,
  deleteAlarmRule,
  shelveAlarmRule,
  unshelveAlarmRule,
  type AlarmRule,
} from '@/lib/store/slices/alarmSlice';
import { Plus, Trash2, Pencil, Archive, ArchiveRestore, Settings } from 'lucide-react';

// ── Priority dot + text ───────────────────────────────────────────────────────
const priorityDot: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-500',
  LOW:      'bg-indigo-400',
  INFO:     'bg-slate-400',
};
const priorityText: Record<string, string> = {
  CRITICAL: 'text-rose-700 dark:text-rose-300',
  HIGH:     'text-orange-700 dark:text-orange-300',
  MEDIUM:   'text-yellow-700 dark:text-yellow-300',
  LOW:      'text-indigo-600 dark:text-indigo-300',
  INFO:     'text-slate-500 dark:text-slate-400',
};

// ── Condition type badge colors ───────────────────────────────────────────────
const conditionBadge: Record<string, string> = {
  THRESHOLD:      'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  RANGE:          'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  DEVIATION:      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RATE_OF_CHANGE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  QUALITY:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

interface FormData {
  name: string;
  description: string;
  tagName: string;
  field: string;
  conditionType: string;
  operator: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

function AlarmRulesContent() {
  const dispatch = useAppDispatch();
  const { rules, rulesLoading, actionLoading } = useAppSelector((state) => state.alarm);
  const { user } = useAppSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    tagName: '',
    field: '',
    conditionType: 'THRESHOLD',
    operator: 'GREATER_THAN',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    dispatch(loadAlarmRules({ limit: 50 }) as any);
  }, [dispatch]);

  const handleOpenModal = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        tagName: rule.tagName,
        field: rule.field,
        conditionType: rule.conditionType,
        operator: rule.operator,
        priority: rule.priority,
      });
    } else {
      setEditingRule(null);
      setFormData({ name: '', description: '', tagName: '', field: '', conditionType: 'THRESHOLD', operator: 'GREATER_THAN', priority: 'MEDIUM' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      await dispatch(updateAlarmRule({ ruleId: editingRule._id, data: formData as Partial<AlarmRule> }) as any);
    } else {
      await dispatch(createAlarmRule(formData as Partial<AlarmRule>) as any);
    }
    setShowModal(false);
  };

  const handleDelete = async (ruleId: string) => {
    await dispatch(deleteAlarmRule(ruleId) as any);
    setShowDeleteConfirm(null);
  };

  const handleToggleShelve = async (rule: any) => {
    if (rule.isShelved) {
      await dispatch(unshelveAlarmRule(rule._id) as any);
    } else {
      await dispatch(shelveAlarmRule({ ruleId: rule._id }) as any);
    }
  };

  const canEdit = user?.role !== 'Viewer' && user?.role !== 'Operator';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alarm Rules</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage ISA-18.2 alarm rule definitions</p>
        </div>
        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        )}
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {rulesLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading rules…</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No alarm rules defined</p>
            {canEdit && (
              <button
                onClick={() => handleOpenModal()}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Create your first rule →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tag</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                {canEdit && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rules.map((rule) => (
                <tr key={rule._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{rule.name}</p>
                    {rule.description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">{rule.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                      {rule.tagName}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5">.{rule.field}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${conditionBadge[rule.conditionType] ?? 'bg-slate-100 text-slate-600'}`}>
                      {rule.conditionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${priorityText[rule.priority] ?? 'text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${priorityDot[rule.priority] ?? 'bg-slate-400'}`} />
                      {rule.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Enabled/Disabled pill toggle */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        rule.isEnabled
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${rule.isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {rule.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {rule.isShelved && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Shelved
                        </span>
                      )}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(rule)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleShelve(rule)}
                          disabled={actionLoading === rule._id}
                          title={rule.isShelved ? 'Unshelve' : 'Shelve'}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50"
                        >
                          {rule.isShelved ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(rule._id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[var(--shadow-modal)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editingRule ? 'Edit Alarm Rule' : 'Create Alarm Rule'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., High Temperature"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tag Name *</label>
                  <input
                    type="text"
                    value={formData.tagName}
                    onChange={(e) => setFormData({ ...formData, tagName: e.target.value.toUpperCase() })}
                    placeholder="e.g., TT-101-H"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Field *</label>
                  <input
                    type="text"
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    placeholder="e.g., temperature"
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as FormData['priority'] })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Condition Type *</label>
                  <select
                    value={formData.conditionType}
                    onChange={(e) => setFormData({ ...formData, conditionType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="THRESHOLD">Threshold</option>
                    <option value="RANGE">Range</option>
                    <option value="DEVIATION">Deviation</option>
                    <option value="RATE_OF_CHANGE">Rate of Change</option>
                    <option value="QUALITY">Quality</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Operator *</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="GREATER_THAN">Greater Than (&gt;)</option>
                    <option value="LESS_THAN">Less Than (&lt;)</option>
                    <option value="EQUAL">Equal (==)</option>
                    <option value="NOT_EQUAL">Not Equal (!=)</option>
                    <option value="BETWEEN">Between</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description…"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[var(--shadow-modal)] p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Delete Rule?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlarmRulesPage() {
  return <AlarmRulesContent />;
}
