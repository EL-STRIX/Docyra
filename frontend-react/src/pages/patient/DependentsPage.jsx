import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, Plus, Trash2, AlertCircle } from 'lucide-react';
import dependentsApi from '../../services/dependents.api.js';

export function DependentsPage() {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'child',
    dateOfBirth: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadDependents = async () => {
    try {
      const res = await dependentsApi.getDependents();
      if (res.success) {
        setDependents(res.data.dependents || []);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDependents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await dependentsApi.createDependent(formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({ name: '', relationship: 'child', dateOfBirth: '' });
        loadDependents();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add dependent profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this family dependent profile?')) return;
    try {
      await dependentsApi.deleteDependent(id);
      loadDependents();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove dependent');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="badge-primary text-[10px]">Family Health</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Family Dependents
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Manage profiles for children, spouse, or elder parents to easily book appointments on their behalf.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-accent text-xs py-2.5 px-5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Family Member</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-text-secondary">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading family members...</p>
        </div>
      ) : dependents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-4">
          <Users className="w-12 h-12 text-neutral-text-secondary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-text-primary">No Family Dependents Added</h3>
            <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
              Add family profiles so you can select them directly when booking appointments with specialists.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs py-2 px-4 inline-flex"
          >
            + Add First Dependent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.map((dep) => (
            <div
              key={dep._id}
              className="card-docyra p-6 flex flex-col justify-between space-y-5 bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center font-bold text-base">
                    {dep.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-text-primary">{dep.name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-bg border border-neutral-border text-brand-primary capitalize">
                      {dep.relationship}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(dep._id)}
                  className="p-1.5 rounded-lg text-neutral-text-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Remove Dependent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 border-t border-neutral-border text-xs text-neutral-text-secondary flex justify-between items-center">
                <span>Date of Birth:</span>
                <span className="font-semibold text-neutral-text-primary">
                  {dep.dateOfBirth ? format(new Date(dep.dateOfBirth), 'MMM dd, yyyy') : 'Not set'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dependent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-docyra-elevated animate-fadeIn">
            <h3 className="text-lg font-bold text-neutral-text-primary border-b border-neutral-border pb-3">
              Add Family Dependent
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maya Doe"
                  className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Relationship *</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                >
                  <option value="child">Child</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-text-primary">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent text-xs py-2 px-5"
                >
                  {submitting ? 'Saving Profile...' : 'Save Dependent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DependentsPage;
