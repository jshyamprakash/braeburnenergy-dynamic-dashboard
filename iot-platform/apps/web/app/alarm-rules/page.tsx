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
import { Plus, Trash2, Clock, CheckCircle } from 'lucide-react';

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  LOW: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  INFO: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200',
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
      setFormData({
        name: '',
        description: '',
        tagName: '',
        field: '',
        conditionType: 'THRESHOLD',
        operator: 'GREATER_THAN',
        priority: 'MEDIUM',
      });
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Alarm Rules</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage ISA-18.2 alarm rule definitions</p>
          </div>
          {user?.role !== 'Viewer' && user?.role !== 'Operator' && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          )}
        </div>

        {/* Rules Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {rulesLoading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">Loading rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">No alarm rules defined</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Tag</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Field</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Condition</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Priority</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{rule.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{rule.tagName}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{rule.field}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{rule.conditionType}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[rule.priority]}`}>
                        {rule.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {rule.isShelved && <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">Shelved</span>}
                        {!rule.isEnabled && <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">Disabled</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-x-2 flex">
                      {user?.role !== 'Viewer' && user?.role !== 'Operator' && (
                        <>
                          <button
                            onClick={() => handleOpenModal(rule)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleShelve(rule)}
                            disabled={actionLoading === rule._id}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title={rule.isShelved ? 'Unshelve' : 'Shelve'}
                          >
                            {rule.isShelved ? 'Unshelve' : 'Shelve'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(rule._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {editingRule ? 'Edit Alarm Rule' : 'Create Alarm Rule'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., High Temperature"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag Name *</label>
                    <input
                      type="text"
                      value={formData.tagName}
                      onChange={(e) => setFormData({ ...formData, tagName: e.target.value.toUpperCase() })}
                      placeholder="e.g., TT-101-H"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field *</label>
                    <input
                      type="text"
                      value={formData.field}
                      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                      placeholder="e.g., temperature"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="INFO">Info</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition Type *</label>
                    <select
                      value={formData.conditionType}
                      onChange={(e) => setFormData({ ...formData, conditionType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="THRESHOLD">Threshold</option>
                      <option value="RANGE">Range</option>
                      <option value="DEVIATION">Deviation</option>
                      <option value="RATE_OF_CHANGE">Rate of Change</option>
                      <option value="QUALITY">Quality</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operator *</label>
                    <select
                      value={formData.operator}
                      onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingRule ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delete Rule?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlarmRulesPage() {
  return (
    <>
      <AlarmRulesContent />
    </>
  );
}
