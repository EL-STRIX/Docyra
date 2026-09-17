import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight, HeartPulse, Brain, Bone, Baby, Eye, Sparkles } from 'lucide-react';
import apiClient from '../../services/apiClient';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const Specializations = () => {
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/specializations');
        if (res.data) {
          setSpecializations(res.data);
        }
      } catch (err) {
        console.error('Error fetching specializations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecializations();
  }, []);

  const getSpecialtyIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('cardio')) return <HeartPulse className="w-7 h-7 text-rose-600" />;
    if (lower.includes('neuro')) return <Brain className="w-7 h-7 text-indigo-600" />;
    if (lower.includes('ortho')) return <Bone className="w-7 h-7 text-amber-600" />;
    if (lower.includes('pedia')) return <Baby className="w-7 h-7 text-emerald-600" />;
    if (lower.includes('ophthal') || lower.includes('eye')) return <Eye className="w-7 h-7 text-sky-600" />;
    return <Stethoscope className="w-7 h-7 text-docyra-primary" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="primary">Medical Coverage</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
          Browse by Medical Specialization
        </h1>
        <p className="text-lg text-docyra-text-secondary leading-relaxed">
          Find accredited doctors and specialists across a comprehensive range of clinical fields.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading specializations..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {specializations.length > 0 ? (
            specializations.map((spec) => (
              <div key={spec._id || spec.slug} className="card-docyra p-6 flex flex-col justify-between space-y-4 group">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-docyra-neutral-border flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getSpecialtyIcon(spec.name)}
                  </div>
                  <h3 className="text-xl font-bold text-docyra-text-primary group-hover:text-docyra-primary transition-colors">
                    {spec.name}
                  </h3>
                  <p className="text-sm text-docyra-text-secondary leading-relaxed">
                    {spec.description || `Specialized consultations and diagnostics in ${spec.name.toLowerCase()} provided by verified practitioners.`}
                  </p>
                </div>

                <div className="pt-4 border-t border-docyra-neutral-border">
                  <Link
                    to={`/doctors?specialization=${spec._id}`}
                    className="text-xs font-bold text-docyra-primary hover:text-docyra-primary-dark flex items-center justify-between"
                  >
                    <span>Find {spec.name} Specialists</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            ['Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Orthopedics', 'General Medicine', 'Gynecology', 'Ophthalmology', 'Psychiatry'].map((name) => (
              <div key={name} className="card-docyra p-6 flex flex-col justify-between space-y-4 group">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-docyra-neutral-border flex items-center justify-center">
                    {getSpecialtyIcon(name)}
                  </div>
                  <h3 className="text-xl font-bold text-docyra-text-primary group-hover:text-docyra-primary">
                    {name}
                  </h3>
                  <p className="text-sm text-docyra-text-secondary leading-relaxed">
                    Specialized medical consultations and diagnostic care provided by verified clinicians.
                  </p>
                </div>

                <div className="pt-4 border-t border-docyra-neutral-border">
                  <Link
                    to="/doctors"
                    className="text-xs font-bold text-docyra-primary hover:text-docyra-primary-dark flex items-center justify-between"
                  >
                    <span>Find {name} Specialists</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Specializations;
