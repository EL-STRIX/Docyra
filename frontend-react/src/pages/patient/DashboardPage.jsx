import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Download,
  Star,
  Users,
} from 'lucide-react';
import appointmentsApi from '../../services/appointments.api.js';
import useAuth from '../../context/useAuth.js';
import useSocketEvent from '../../context/useSocketEvent.js';

export function DashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await appointmentsApi.getMyAppointments();
      if (res.success) {
        setAppointments(res.data.appointments || []);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Real-time listener: re-fetch appointments whenever status changes or new appointment is made
  useSocketEvent('appointment:created', () => fetchAppointments());
  useSocketEvent('appointment:statusChanged', () => fetchAppointments());
  useSocketEvent('appointment:cancelled', () => fetchAppointments());

  const now = new Date();

  const upcomingList = appointments.filter(
    (a) =>
      ['pending', 'confirmed'].includes(a.status) &&
      new Date(a.slotStart) >= now
  );

  const pastList = appointments.filter(
    (a) =>
      a.status === 'completed' ||
      (['pending', 'confirmed'].includes(a.status) && new Date(a.slotStart) < now)
  );

  const cancelledList = appointments.filter((a) => a.status === 'cancelled');

  const displayedList =
    filterTab === 'upcoming'
      ? upcomingList
      : filterTab === 'past'
      ? pastList
      : cancelledList;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="badge-success">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="badge-warning">
            <Clock className="w-3 h-3" />
            <span>Pending Doctor Confirmation</span>
          </span>
        );
      case 'completed':
        return (
          <span className="badge-info">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge-error">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="badge-info">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="badge-primary text-[10px]">Patient Dashboard</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
            Hello, {user?.name || 'Patient'}!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-text-secondary">
            Manage your medical appointments, family dependents, and healthcare records.
          </p>
        </div>

        <Link to="/doctors" className="btn-accent text-xs sm:text-sm py-2.5 px-5 shrink-0">
          <Plus className="w-4 h-4" />
          <span>Book New Appointment</span>
        </Link>
      </div>

      {/* Quick Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card-docyra p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-secondary">Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary block">
            {upcomingList.length}
          </span>
        </div>

        <div className="card-docyra p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-secondary">Past Visits</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary block">
            {pastList.length}
          </span>
        </div>

        <div className="card-docyra p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-secondary">Cancelled</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary block">
            {cancelledList.length}
          </span>
        </div>

        <div className="card-docyra p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-text-secondary">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary block">
            {appointments.length}
          </span>
        </div>
      </div>

      {/* Appointment Listings with Tabs */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab('upcoming')}
              className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                filterTab === 'upcoming'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-text-secondary hover:text-brand-primary hover:bg-neutral-bg'
              }`}
            >
              Upcoming ({upcomingList.length})
            </button>
            <button
              onClick={() => setFilterTab('past')}
              className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                filterTab === 'past'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-text-secondary hover:text-brand-primary hover:bg-neutral-bg'
              }`}
            >
              Past Visits ({pastList.length})
            </button>
            <button
              onClick={() => setFilterTab('cancelled')}
              className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition-all ${
                filterTab === 'cancelled'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-text-secondary hover:text-brand-primary hover:bg-neutral-bg'
              }`}
            >
              Cancelled ({cancelledList.length})
            </button>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="text-center py-20 text-neutral-text-secondary">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading appointments...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-4">
            <Calendar className="w-12 h-12 text-neutral-text-secondary mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-text-primary">
                No {filterTab} appointments
              </h3>
              <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
                {filterTab === 'upcoming'
                  ? 'You have no scheduled doctor consultations ahead. Explore partner clinics to book.'
                  : 'No appointments in this category.'}
              </p>
            </div>
            {filterTab === 'upcoming' && (
              <Link to="/doctors" className="btn-primary text-xs py-2 px-4 inline-flex">
                Book a Consultation
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedList.map((apt) => {
              const doctorProfile = apt.doctorId || {};
              const doctorUser = typeof doctorProfile.userId === 'object' && doctorProfile.userId !== null ? doctorProfile.userId : {};
              const doctorName = doctorProfile.name || doctorUser.name || 'Doctor';
              const specName = doctorProfile.specializationName || doctorProfile.specializationId?.name || 'Medical Specialist';
              const clinic = apt.clinicId || {};
              const dependent = apt.bookedForId;
              const isDependent = apt.bookedForType === 'dependent';

              return (
                <div
                  key={apt._id}
                  className="card-docyra p-6 flex flex-col justify-between space-y-5 hover:shadow-docyra-hover transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(apt.status)}
                      {isDependent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Dependent: {dependent?.name || 'Family'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold text-base shrink-0">
                        {doctorName ? doctorName.charAt(0) : 'D'}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="font-bold text-base text-neutral-text-primary truncate">
                          {doctorName}
                        </h3>
                        <p className="text-xs font-semibold text-brand-primary">
                          {specName}
                        </p>
                        <p className="text-[11px] text-neutral-text-secondary flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-neutral-text-secondary shrink-0" />
                          <span>{clinic.name || doctorProfile.clinicAddress || 'Clinic Affiliated'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Date & Time Slot Box */}
                    <div className="p-3 rounded-xl bg-neutral-bg border border-neutral-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-neutral-text-primary font-bold">
                        <Calendar className="w-4 h-4 text-brand-primary" />
                        <span>{format(new Date(apt.slotStart), 'EEEE, MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-brand-primary">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(new Date(apt.slotStart), 'hh:mm a')}</span>
                      </div>
                    </div>

                    {apt.reasonForVisit && (
                      <p className="text-xs text-neutral-text-secondary italic line-clamp-1">
                        Reason: &ldquo;{apt.reasonForVisit}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-3 border-t border-neutral-border flex items-center justify-between gap-2">
                    <a
                      href={appointmentsApi.getIcsCalendarUrl(apt._id)}
                      download
                      className="text-xs font-bold text-neutral-text-secondary hover:text-brand-primary flex items-center gap-1 p-1.5 rounded-lg hover:bg-neutral-bg"
                      title="Download .ics Calendar Invite"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add to Calendar</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {apt.status === 'completed' && (
                        <Link
                          to={`/appointments/${apt._id}#review`}
                          className="btn-outline text-xs py-1.5 px-3"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span>Review</span>
                        </Link>
                      )}
                      <Link
                        to={`/appointments/${apt._id}`}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
