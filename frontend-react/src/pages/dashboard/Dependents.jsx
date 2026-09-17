import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Users,
  UserPlus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  HeartPulse
} from 'lucide-react';

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: 'child',
    dateOfBirth: '',
    gender: 'male',
    medicalNotes: ''
  });

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/dependents');
      setDependents(res.data?.dependents || []);
    } catch (err) {
      console.error('Failed to fetch dependents:', err);
      setErrorMsg('Failed to load your family members/dependents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependents();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      await apiClient.post('/dependents', formData);
      setSuccessMsg('Family member added successfully!');
      setShowAddModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        relationship: 'child',
        dateOfBirth: '',
        gender: 'male',
        medicalNotes: ''
      });
      fetchDependents();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to add family member.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this family member?')) return;
    try {
      setDeletingId(id);
      setErrorMsg('');
      await apiClient.delete(`/dependents/${id}`);
      setSuccessMsg('Family member removed.');
      fetchDependents();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove family member.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-docyra-text-primary">Family Members & Dependents</h1>
          <p className="text-xs text-docyra-text-secondary mt-1">
            Manage dependent profiles so you can easily book appointments on their behalf
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Add Family Member
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-docyra-text-secondary mt-3">Loading family members...</p>
        </div>
      ) : dependents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-docyra-neutral-border text-center">
          <div className="w-16 h-16 rounded-full bg-docyra-primary-light text-docyra-primary flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-docyra-text-primary">No Family Members Added</h3>
          <p className="text-xs text-docyra-text-secondary max-w-sm mx-auto mt-1 mb-6">
            You haven't added any dependents yet. Add your children, spouse, or parents to quickly book clinic visits for them.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Add First Dependent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.map((dep) => (
            <div
              key={dep._id}
              className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-docyra-primary-light text-docyra-primary text-2xs font-bold uppercase">
                    {dep.relationship}
                  </span>
                  <button
                    onClick={() => handleDelete(dep._id)}
                    disabled={deletingId === dep._id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove Dependent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-docyra-text-primary">
                    {dep.firstName} {dep.lastName}
                  </h3>
                  <div className="text-xs text-docyra-text-secondary mt-1 flex items-center gap-2">
                    <span>{dep.gender ? dep.gender.toUpperCase() : 'N/A'}</span>
                    <span>•</span>
                    <span>
                      DOB: {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {dep.medicalNotes && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                    <HeartPulse className="w-4 h-4 text-docyra-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Notes:</span> {dep.medicalNotes}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <Link
                  to="/doctors"
                  className="text-xs font-bold text-docyra-primary hover:underline inline-flex items-center gap-1"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> Book Appointment
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-docyra-text-primary">Add Family Member</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-docyra-text-primary uppercase mb-1">
                  Medical Notes / Allergies (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  placeholder="e.g. Asthma, Penicillin allergy, Diabetes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-docyra-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Dependent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
