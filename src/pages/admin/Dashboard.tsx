import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

interface Stats {
  classes: number;
  teachers: number;
  students: number;
  submittedToday: number;
}

const STAT_CARDS = [
  { key: 'classes' as const, label: 'Total Classes', path: '/admin/classes', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { key: 'teachers' as const, label: 'Total Teachers', path: '/admin/teachers', color: 'bg-green-500', light: 'bg-green-50 text-green-600',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'students' as const, label: 'Total Students', path: '/admin/students', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-600',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    async function load() {
      const [classesSnap, teachersSnap, studentsSnap, attendanceSnap] = await Promise.all([
        getCountFromServer(collection(db, 'classes')),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'teacher'))),
        getCountFromServer(collection(db, 'students')),
        getDocs(query(collection(db, 'attendance'), where('date', '==', today))),
      ]);
      setStats({
        classes: classesSnap.data().count,
        teachers: teachersSnap.data().count,
        students: studentsSnap.data().count,
        submittedToday: attendanceSnap.size,
      });
    }
    load();
  }, [today]);

  const pct = stats && stats.classes > 0 ? Math.round((stats.submittedToday / stats.classes) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Welcome back, {user?.displayName} · {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => navigate('/register')}
          className="hidden sm:flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Teacher
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {STAT_CARDS.map(({ key, label, path, light, icon }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            className="bg-white rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${light}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            {stats === null ? (
              <div className="animate-pulse">
                <div className="h-8 bg-slate-100 rounded w-12 mb-1" />
                <div className="h-3 bg-slate-100 rounded w-24" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-slate-800">{stats[key]}</p>
                <p className="text-sm text-slate-400 mt-0.5">{label}</p>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Today's attendance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-800">Today's Attendance</h2>
            <p className="text-xs text-slate-400 mt-0.5">{format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
          {stats && (
            <span className="text-2xl font-bold text-purple-600">{pct}%</span>
          )}
        </div>

        {stats === null ? (
          <div className="animate-pulse h-3 bg-slate-100 rounded-full" />
        ) : (
          <>
            <div className="bg-slate-100 rounded-full h-3 overflow-hidden mb-3">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{stats.submittedToday} of {stats.classes} classes submitted</span>
              <span className={`font-semibold ${pct === 100 ? 'text-green-600' : 'text-amber-500'}`}>
                {pct === 100 ? 'All done' : `${stats.classes - stats.submittedToday} pending`}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
