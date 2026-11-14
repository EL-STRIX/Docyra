import { useState, useEffect } from 'react';
import { format, differenceInYears } from 'date-fns';
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Droplet,
  HeartPulse,
  Activity,
  Phone,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import dependentsApi from '../../services/dependents.api.js';
import useSocket from '../../context/useSocket.js';

export function DependentsPage() {
  const { addNotification } = useSocket() || {};
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const initialFormData = {
    name: '',
    relationship: 'Child',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    heightCm: '',
    weightKg: '',
  };

  const [formData, setFormData] = useState(initialFormData);
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
      const payload = {
        name: formData.name.trim(),
        relationship: formData.relationship,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup || null,
        allergies: formData.allergies.trim(),
        chronicConditions: formData.chronicConditions.trim(),
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone.trim(),
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
      };

      const res = await dependentsApi.createDependent(payload);
      if (res.success) {
        setShowAddModal(false);
        const createdName = formData.name;
        const createdRel = formData.relationship;
        setFormData(initialFormData);
        loadDependents();
        if (addNotification) {
          addNotification({
            type: 'dependent:created',
            category: 'family',
            title: 'Family Member Added',
            message: `${createdName} (${createdRel}) was added to your family profiles with medical details.`,
            link: '/dependents',
            actionLabel: 'View Family',
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add dependent profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const targetDep = dependents.find((d) => d._id === id);
    if (!window.confirm('Are you sure you want to remove this family dependent profile?')) return;
    try {
      await dependentsApi.deleteDependent(id);
      loadDependents();
      if (addNotification) {
        addNotification({
          type: 'dependent:deleted',
          category: 'family',
          title: 'Family Member Removed',
          message: `${targetDep?.name || 'Family member'} profile was removed from your account.`,
          link: '/dependents',
        });
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove dependent');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="badge-primary text-[10px]">Family Health Records</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Family Dependents
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Manage profiles with blood group, allergies, and diagnostic history for children, spouse, or elder parents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-accent text-xs py-2.5 px-5 shrink-0 flex items-center gap-2 cursor-pointer"
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
              Add family profiles with blood group and allergy details so doctors can provide personalized medical consultations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Dependent</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.map((dep) => {
            const age = dep.dateOfBirth
              ? differenceInYears(new Date(), new Date(dep.dateOfBirth))
              : null;

            return (
              <div
                key={dep._id}
                className="card-docyra p-6 flex flex-col justify-between space-y-4 bg-white border border-neutral-border hover:shadow-md transition-all"
              >
                {/* Header Strip */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center font-bold text-base shrink-0">
                      {dep.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-neutral-text-primary">{dep.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-bg border border-neutral-border text-brand-primary capitalize">
                          {dep.relationship}
                        </span>
                        {dep.bloodGroup && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                            <Droplet className="w-2.5 h-2.5 text-rose-600" />
                            <span>{dep.bloodGroup}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(dep._id)}
                    className="p-1.5 rounded-lg text-neutral-text-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Dependent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Medical Details Summary */}
                <div className="space-y-2 pt-2 border-t border-neutral-border text-xs">
                  <div className="flex justify-between items-center text-neutral-text-secondary">
                    <span>Date of Birth & Age:</span>
                    <span className="font-semibold text-neutral-text-primary">
                      {dep.dateOfBirth ? format(new Date(dep.dateOfBirth), 'dd MMM yyyy') : 'Not set'}
                      {age !== null && ` (${age} yrs)`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-neutral-text-secondary">
                    <span>Gender:</span>
                    <span className="font-semibold text-neutral-text-primary capitalize">
                      {dep.gender ? dep.gender.replace(/_/g, ' ') : 'Not specified'}
                    </span>
                  </div>

                  {(dep.heightCm || dep.weightKg) && (
                    <div className="flex justify-between items-center text-neutral-text-secondary">
                      <span>Vitals:</span>
                      <span className="font-semibold text-neutral-text-primary">
                        {[dep.heightCm ? `${dep.heightCm} cm` : '', dep.weightKg ? `${dep.weightKg} kg` : '']
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    </div>
                  )}

                  {dep.allergies && (
                    <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200/80 text-[11px] text-rose-800 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Known Allergies:</span>
                      </div>
                      <p className="line-clamp-2">{dep.allergies}</p>
                    </div>
                  )}

                  {dep.chronicConditions && (
                    <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        <HeartPulse className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>Medical Conditions:</span>
                      </div>
                      <p className="line-clamp-2">{dep.chronicConditions}</p>
                    </div>
                  )}

                  {(dep.emergencyContactName || dep.emergencyContactPhone) && (
                    <div className="text-[11px] text-neutral-text-secondary pt-1 border-t border-dashed border-neutral-border flex items-center justify-between">
                      <span>Emergency Contact:</span>
                      <span className="font-semibold text-neutral-text-primary truncate max-w-[170px]">
                        {dep.emergencyContactName}{' '}
                        {dep.emergencyContactPhone && `(${dep.emergencyContactPhone})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dependent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-docyra-elevated animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-primary-light text-brand-primary">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-text-primary">
                    Add Family Member
                  </h3>
                  <p className="text-[11px] text-neutral-text-secondary">
                    Enter personal and diagnostic medical details for this profile.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-text-primary">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Relationship *</label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                  >
                    <optgroup label="Immediate Family">
                      <option value="Child">Child</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Spouse">Spouse / Partner</option>
                      <option value="Husband">Husband</option>
                      <option value="Wife">Wife</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                    </optgroup>
                    <optgroup label="Extended Family">
                      <option value="Father-in-law">Father-in-law</option>
                      <option value="Mother-in-law">Mother-in-law</option>
                      <option value="Grandfather">Grandfather</option>
                      <option value="Grandmother">Grandmother</option>
                      <option value="Other">Other Relative</option>
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-rose-500" />
                    <span>Blood Group</span>
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+ (A Positive)</option>
                    <option value="A-">A- (A Negative)</option>
                    <option value="B+">B+ (B Positive)</option>
                    <option value="B-">B- (B Negative)</option>
                    <option value="AB+">AB+ (AB Positive)</option>
                    <option value="AB-">AB- (AB Negative)</option>
                    <option value="O+">O+ (O Positive)</option>
                    <option value="O-">O- (O Negative)</option>
                    <option value="unknown">Unknown / Not Tested</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Date of Birth *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Gender</label>
                  <select
                    value={formData.gender || 'prefer_not_to_say'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white cursor-pointer"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="250"
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                    placeholder="e.g. 140"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="300"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    placeholder="e.g. 35"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Medical Diagnosis Details */}
              <div className="pt-2 border-t border-neutral-border space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center justify-between">
                    <span>Known Drug & Food Allergies</span>
                    <span className="text-[10px] text-neutral-text-secondary font-normal">Helps doctors avoid allergic reactions</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Peanuts, Penicillin, Dust mites (or None)"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-text-primary flex items-center justify-between">
                    <span>Pre-Existing Conditions & Medical History</span>
                    <span className="text-[10px] text-neutral-text-secondary font-normal">Assists doctor diagnosis</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                    placeholder="e.g. Childhood Asthma, Type 1 Diabetes, Eczema (or None)"
                    className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      placeholder="e.g. Mother / Guardian"
                      className="w-full p-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-text-primary">Emergency Phone</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-neutral-text-secondary absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        placeholder="+91 9876543210"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-border text-xs text-neutral-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent text-xs py-2 px-5 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving Profile...' : 'Save Member & Vitals'}</span>
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
