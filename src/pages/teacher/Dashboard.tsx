import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { Class } from '../../types';

interface ClassCard extends Class {
  studentCount: number;
  submittedToday: boolean;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassCard[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const firstName = user?.displayName?.split(' ')[0] ?? 'Teacher';

  useEffect(() => {
    async function load() {
      if (!user?.assignedClassIds?.length) { setLoading(false); return; }
      const cards: ClassCard[] = [];
      for (const classId of user.assignedClassIds) {
        const [classSnap, attendanceSnap] = await Promise.all([
          getDoc(doc(db, 'classes', classId)),
          getDoc(doc(db, 'attendance', `${classId}_${today}`)),
        ]);
        if (!classSnap.exists()) continue;
        const data = classSnap.data();
        cards.push({
          id: classId,
          name: data.name,
          teacherIds: data.teacherIds,
          studentIds: data.studentIds,
          studentCount: (data.studentIds as string[]).length,
          submittedToday: attendanceSnap.exists(),
        });
      }
      setClasses(cards);
      setLoading(false);
    }
    load();
  }, [user, today]);

  const submitted = classes.filter((c) => c.submittedToday).length;
  const pending = classes.length - submitted;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Good morning, {firstName}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Summary pills */}
      {!loading && classes.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'My Classes', value: classes.length, color: 'bg-purple-50 text-purple-600', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            { label: 'Submitted', value: submitted, color: 'bg-green-50 text-green-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Pending', value: pending, color: 'bg-amber-50 text-amber-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending alert */}
      {!loading && pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {pending} class{pending > 1 ? 'es' : ''} still need{pending === 1 ? 's' : ''} attendance today.
        </div>
      )}

      {/* Class cards */}
      <h2 className="font-semibold text-slate-700 mb-4">My Classes</h2>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-20 mb-6" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-slate-400 text-sm">No classes assigned yet. Contact your administrator.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">{cls.name}</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  cls.submittedToday ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {cls.submittedToday ? 'Submitted' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-5">{cls.studentCount} students</p>
              <button
                onClick={() => navigate(`/teacher/class/${cls.id}`)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors mb-2"
              >
                {cls.submittedToday ? 'View Attendance' : 'Mark Attendance'}
              </button>
              <button
                onClick={() => navigate(`/teacher/class/${cls.id}/report`)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                View Report
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
