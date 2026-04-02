import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { Class, AttendanceRecord } from '../../types';

interface ClassSummary extends Class {
  submitted: boolean;
  counts: AttendanceRecord['counts'] | null;
  teacherName: string;
}

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [stats, setStats] = useState<{ classes: number; teachers: number; students: number } | null>(null);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [classSnaps, teacherSnaps, studentSnaps, attendanceSnaps] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'attendance')),
        ]);

        const teacherMap: Record<string, string> = {};
        for (const d of teacherSnaps.docs) teacherMap[d.id] = d.data().displayName;

        const attendanceMap: Record<string, AttendanceRecord> = {};
        for (const d of attendanceSnaps.docs) {
          const data = d.data();
          if (data.date === today) attendanceMap[data.classId] = { id: d.id, ...data } as AttendanceRecord;
        }

        const summaries: ClassSummary[] = classSnaps.docs.map((d) => {
          const data = d.data();
          const record = attendanceMap[d.id];
          return {
            id: d.id,
            name: data.name,
            teacherIds: data.teacherIds ?? [],
            studentIds: data.studentIds ?? [],
            submitted: !!record,
            counts: record?.counts ?? null,
            teacherName: data.teacherIds?.[0] ? (teacherMap[data.teacherIds[0]] ?? 'Unassigned') : 'Unassigned',
          };
        });
        summaries.sort((a, b) => Number(a.submitted) - Number(b.submitted));

        setStats({ classes: classSnaps.size, teachers: teacherSnaps.size, students: studentSnaps.size });
        setClassSummaries(summaries);
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Check console for details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  const submitted = classSummaries.filter((c) => c.submitted).length;
  const pct = stats && stats.classes > 0 ? Math.round((submitted / stats.classes) * 100) : 0;

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {user?.displayName} · {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Classes', key: 'classes' as const, color: 'bg-blue-50 text-blue-600', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
          { label: 'Teachers', key: 'teachers' as const, color: 'bg-green-50 text-green-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          { label: 'Students', key: 'students' as const, color: 'bg-purple-50 text-purple-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        ].map(({ label, key, color, icon }) => (
          <div key={key} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            </div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-7 bg-slate-100 rounded w-10 mb-1" />
                <div className="h-3 bg-slate-100 rounded w-16" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-800">{stats?.[key] ?? 0}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Submission progress */}
      {!loading && stats && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Today's Submissions</h2>
              <p className="text-xs text-slate-400 mt-0.5">{format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
            <span className="text-2xl font-bold text-purple-600">{pct}%</span>
          </div>
          <div className="bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
            <div className="bg-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-slate-400">{submitted} of {stats.classes} classes submitted</p>
        </div>
      )}

      {/* Class report table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Class Reports — Today</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="h-4 bg-slate-100 rounded flex-1" />
                <div className="h-4 bg-slate-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : classSummaries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">No classes found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classSummaries.map((cls) => (
              <div key={cls.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{cls.name}</p>
                  <p className="text-xs text-slate-400">{cls.teacherName}</p>
                </div>
                {cls.submitted && cls.counts ? (
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-sm font-bold text-green-600">{cls.counts.present}</p>
                      <p className="text-xs text-slate-400">Present</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-500">{cls.counts.absent}</p>
                      <p className="text-xs text-slate-400">Absent</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-500">{cls.counts.late}</p>
                      <p className="text-xs text-slate-400">Late</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">Pending</span>
                )}
                <button
                  onClick={() => navigate(`/principal/class/${cls.id}`)}
                  className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors whitespace-nowrap"
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
