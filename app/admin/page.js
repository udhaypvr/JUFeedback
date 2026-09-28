'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, UserPlus, BookOpen, Link as LinkIcon, Users, RefreshCw, Key, LogOut } from 'lucide-react';

export default function AdminPortal() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Entities
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [reports, setReports] = useState([]);

  // Form Inputs
  const [facName, setFacName] = useState('');
  const [facDept, setFacDept] = useState('');
  const [crsCode, setCrsCode] = useState('');
  const [crsName, setCrsName] = useState('');
  const [selFacId, setSelFacId] = useState('');
  const [selCrsId, setSelCrsId] = useState('');
  const [targetOfferingId, setTargetOfferingId] = useState('');
  const [rawPrns, setRawPrns] = useState('');

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      setAuthenticated(true);
    } else {
      alert('Incorrect password! (Default: admin123)');
    }
  };

  const loadData = async () => {
    const { data: facData } = await supabase.from('faculty').select('*');
    const { data: crsData } = await supabase.from('courses').select('*');
    const { data: offData } = await supabase.from('course_offerings').select('id, courses(code, name), faculty(name)');

    setFaculty(facData || []);
    setCourses(crsData || []);
    setOfferings(offData || []);

    // Load Reports
    const { data: ratings } = await supabase.from('feedback_ratings').select('rating, feedback_submissions(course_offering_id)');
    const { data: enrollments } = await supabase.from('student_enrollments').select('course_offering_id');

    const summary = (offData || []).map((off) => {
      const offRatings = (ratings || []).filter((r) => r.feedback_submissions?.course_offering_id === off.id);
      const mappedCount = (enrollments || []).filter((e) => e.course_offering_id === off.id).length;
      const avg = offRatings.length ? (offRatings.reduce((a, c) => a + c.rating, 0) / offRatings.length).toFixed(2) : 'No Submissions';

      return { ...off, mappedCount, avg };
    });

    setReports(summary);
  };

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  const addFaculty = async () => {
    if (!facName.trim()) return alert('Enter faculty name');
    await supabase.from('faculty').insert([{ name: facName, department: facDept }]);
    setFacName(''); setFacDept('');
    loadData();
  };

  const addCourse = async () => {
    if (!crsCode.trim() || !crsName.trim()) return alert('Fill all course fields');
    await supabase.from('courses').insert([{ code: crsCode.toUpperCase(), name: crsName }]);
    setCrsCode(''); setCrsName('');
    loadData();
  };

  const createOffering = async () => {
    if (!selFacId || !selCrsId) return alert('Select both faculty and course');
    await supabase.from('course_offerings').insert([{ faculty_id: selFacId, course_id: selCrsId }]);
    loadData();
  };

  const bulkBindPRNs = async () => {
    if (!targetOfferingId) return alert('Select target course offering');
    const prnArray = rawPrns.split(/[\n,]+/).map((p) => p.trim().toUpperCase()).filter((p) => p.length > 0);
    if (prnArray.length === 0) return alert('Enter at least one PRN');

    const payload = prnArray.map((prn) => ({ student_prn: prn, course_offering_id: parseInt(targetOfferingId) }));
    await supabase.from('student_enrollments').upsert(payload, { onConflict: 'student_prn,course_offering_id' });

    alert(`Successfully bound ${prnArray.length} PRNs!`);
    setRawPrns('');
    loadData();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-indigo-900">Admin Control Portal</h2>
              <p className="text-xs text-slate-500">Authenticate to manage faculty mappings</p>
            </div>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2">
              <Key className="w-4 h-4" />
              <span>Authenticate</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg">Joy University Admin Center</h1>
          <button onClick={() => setAuthenticated(false)} className="bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1">
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Card 1: Faculty */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>1. Add Faculty</span>
            </h3>
            <input type="text" placeholder="Faculty Name" value={facName} onChange={(e) => setFacName(e.target.value)} className="w-full border p-2 text-xs rounded-xl" />
            <input type="text" placeholder="Department" value={facDept} onChange={(e) => setFacDept(e.target.value)} className="w-full border p-2 text-xs rounded-xl" />
            <button onClick={addFaculty} className="w-full bg-slate-900 text-white text-xs py-2.5 rounded-xl font-semibold">Save Faculty</button>
          </div>

          {/* Card 2: Course */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>2. Add Course</span>
            </h3>
            <input type="text" placeholder="Course Code (CSE301)" value={crsCode} onChange={(e) => setCrsCode(e.target.value)} className="w-full border p-2 text-xs rounded-xl" />
            <input type="text" placeholder="Course Name" value={crsName} onChange={(e) => setCrsName(e.target.value)} className="w-full border p-2 text-xs rounded-xl" />
            <button onClick={addCourse} className="w-full bg-slate-900 text-white text-xs py-2.5 rounded-xl font-semibold">Save Course</button>
          </div>

          {/* Card 3: Offering */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-indigo-600" />
              <span>3. Create Offering</span>
            </h3>
            <select value={selFacId} onChange={(e) => setSelFacId(e.target.value)} className="w-full border p-2 text-xs rounded-xl bg-white">
              <option value="">-- Select Faculty --</option>
              {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={selCrsId} onChange={(e) => setSelCrsId(e.target.value)} className="w-full border p-2 text-xs rounded-xl bg-white">
              <option value="">-- Select Course --</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
            <button onClick={createOffering} className="w-full bg-indigo-600 text-white text-xs py-2.5 rounded-xl font-semibold">Link Offering</button>
          </div>
        </div>

        {/* Bulk Binding */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>4. Bulk Bind PRNs</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <select value={targetOfferingId} onChange={(e) => setTargetOfferingId(e.target.value)} className="w-full border p-3 text-xs rounded-xl bg-white">
              <option value="">-- Select Target Course Offering --</option>
              {offerings.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.courses?.code}: {off.courses?.name} — [{off.faculty?.name}]
                </option>
              ))}
            </select>
            <div className="space-y-2">
              <textarea rows={4} placeholder="Paste PRNs (line separated)" value={rawPrns} onChange={(e) => setRawPrns(e.target.value)} className="w-full border p-3 text-xs font-mono rounded-xl" />
              <button onClick={bulkBindPRNs} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-semibold">Bind PRNs</button>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Summary Reports</h3>
            <button onClick={loadData} className="text-xs bg-slate-100 p-2 rounded-lg flex items-center space-x-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4">Course</th>
                <th className="p-4">Faculty</th>
                <th className="p-4">Mapped Students</th>
                <th className="p-4">Average Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="p-4 font-bold">{r.courses?.code} - {r.courses?.name}</td>
                  <td className="p-4">{r.faculty?.name}</td>
                  <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">{r.mappedCount} PRNs</span></td>
                  <td className="p-4"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">{r.avg} / 5.0</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}