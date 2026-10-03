'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Star, 
  MessageSquare, 
  Download, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  School as SchoolIcon,
  Filter,
  CheckCircle2,
  Lock,
  LogOut,
  KeyRound,
  BookOpen,
  Trophy,
  Award,
  FileSpreadsheet
} from 'lucide-react';

const CRITERIA_NAMES = {
  1: "Clarity of Instruction",
  2: "Subject Knowledge",
  3: "Communication & Availability",
  4: "Fairness in Assessment",
  5: "Teaching Style & ICT",
  6: "Respect & Inclusivity",
  7: "Punctuality & Professionalism",
  8: "Feedback Quality",
  9: "Support for Student Success",
  10: "Overall Satisfaction"
};

export default function AdminDashboard() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Report Tab: 'school' | 'faculty' | 'course' | 'ranking'
  const [activeTab, setActiveTab] = useState('faculty');

  // Data states
  const [facultyData, setFacultyData] = useState([]);
  const [courseData, setCourseData] = useState([]);
  const [schoolData, setSchoolData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Accordion
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [expandedFacultyId, setExpandedFacultyId] = useState(null);
  const [facultyDetails, setFacultyDetails] = useState({});

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('ju_admin_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
      fetchAllReports();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    if (passwordInput === correctPassword) {
      sessionStorage.setItem('ju_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      fetchAllReports();
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ju_admin_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const fetchAllReports = async () => {
    setLoading(true);

    // 1. Faculty Analytics
    const { data: facRes } = await supabase
      .from('instructor_analytics')
      .select('*')
      .order('overall_avg_rating', { ascending: false });
    
    // 2. Course Analytics
    const { data: crsRes } = await supabase
      .from('course_analytics')
      .select('*')
      .order('avg_rating', { ascending: false });

    // 3. School Analytics
    const { data: schRes } = await supabase
      .from('school_analytics')
      .select('*')
      .order('avg_rating', { ascending: false });

    setFacultyData(facRes || []);
    setCourseData(crsRes || []);
    setSchoolData(schRes || []);
    setLoading(false);
  };

  const loadFacultyDetails = async (employeeId) => {
    if (facultyDetails[employeeId]) {
      setExpandedFacultyId(expandedFacultyId === employeeId ? null : employeeId);
      return;
    }

    const { data: offerings } = await supabase
      .from('course_offerings')
      .select('id, course_code, courses(name)')
      .eq('employee_id', employeeId);

    const offeringIds = (offerings || []).map((o) => o.id);

    if (offeringIds.length === 0) {
      setFacultyDetails((prev) => ({
        ...prev,
        [employeeId]: { criteriaAvg: {}, comments: [] }
      }));
      setExpandedFacultyId(employeeId);
      return;
    }

    const { data: submissions } = await supabase
      .from('feedback_submissions')
      .select('id, comment, created_at')
      .in('course_offering_id', offeringIds);

    const submissionIds = (submissions || []).map((s) => s.id);
    const commentsList = (submissions || []).filter((s) => s.comment && s.comment.trim() !== '');

    let criteriaAvg = {};
    if (submissionIds.length > 0) {
      const { data: ratings } = await supabase
        .from('feedback_ratings')
        .select('criteria_id, rating')
        .in('submission_id', submissionIds);

      const sums = {};
      const counts = {};
      (ratings || []).forEach((r) => {
        sums[r.criteria_id] = (sums[r.criteria_id] || 0) + r.rating;
        counts[r.criteria_id] = (counts[r.criteria_id] || 0) + 1;
      });

      Object.keys(sums).forEach((cid) => {
        criteriaAvg[cid] = (sums[cid] / counts[cid]).toFixed(2);
      });
    }

    setFacultyDetails((prev) => ({
      ...prev,
      [employeeId]: { criteriaAvg, comments: commentsList, offerings }
    }));
    setExpandedFacultyId(employeeId);
  };

  // Filtered lists
  const filteredFaculty = facultyData.filter((item) => {
    const matchesSearch = item.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === 'ALL' || item.school === selectedSchool;
    return matchesSearch && matchesSchool;
  });

  const filteredCourses = courseData.filter((item) => {
    const matchesSearch = item.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.course_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === 'ALL' || item.school === selectedSchool;
    return matchesSearch && matchesSchool;
  });

  // Ranking view sorts faculty by overall avg rating descending
  const rankedFaculty = [...filteredFaculty].sort((a, b) => b.overall_avg_rating - a.overall_avg_rating);

  // Dynamic CSV Export
  const exportActiveReport = () => {
    let headers = [];
    let rows = [];
    let filename = `JU_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'school') {
      headers = ['School Name,Total Faculty,Total Submissions,Average Rating\n'];
      rows = schoolData.map((s) => `"${s.school}",${s.total_faculty},${s.total_submissions},${s.avg_rating}`);
    } else if (activeTab === 'faculty') {
      headers = ['Employee ID,Faculty Name,School,Total Submissions,Average Rating\n'];
      rows = filteredFaculty.map((f) => `"${f.employee_id}","${f.faculty_name}","${f.school}",${f.total_submissions},${f.overall_avg_rating}`);
    } else if (activeTab === 'course') {
      headers = ['Course Code,Course Name,School,Programme,Total Submissions,Average Rating\n'];
      rows = filteredCourses.map((c) => `"${c.course_code}","${c.course_name}","${c.school}","${c.programme}",${c.total_submissions},${c.avg_rating}`);
    } else if (activeTab === 'ranking') {
      headers = ['Rank,Employee ID,Faculty Name,School,Total Submissions,Average Rating\n'];
      rows = rankedFaculty.map((f, idx) => `${idx + 1},"${f.employee_id}","${f.faculty_name}","${f.school}",${f.total_submissions},${f.overall_avg_rating}`);
    }

    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // --- LOGIN LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-900 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Admin Portal</h2>
            <p className="text-xs text-slate-500 mt-1">Enter password to access feedback reports</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600"
                autoFocus
              />
            </div>
            {authError && <p className="text-xs font-semibold text-rose-600 text-left pl-1">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-3 text-xs rounded-xl shadow-md transition"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
<div className="bg-white w-10 h-10 shadow flex items-center justify-center overflow-hidden p-[3px]">
  <img 
    src="/logo.png" 
    alt="Joy University Logo" 
    className="w-full h-full object-contain"
  />
</div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Joy University</h1>
              <p className="text-xs text-indigo-200 tracking-wide">Report Generation Center</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={exportActiveReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export {activeTab.toUpperCase()} CSV</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-indigo-800 hover:bg-indigo-700 text-indigo-100 px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-700 transition flex items-center space-x-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* REPORT TYPE NAVIGATION TABS */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveTab('school')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'school'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SchoolIcon className="w-4 h-4" />
            <span>1. School Wise</span>
          </button>

          <button
            onClick={() => setActiveTab('faculty')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'faculty'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Faculty Wise</span>
          </button>

          <button
            onClick={() => setActiveTab('course')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'course'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>3. Course Wise</span>
          </button>

          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'ranking'
                ? 'bg-indigo-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>4. Ranking Wise</span>
          </button>
        </div>

        {/* SEARCH AND SCHOOL FILTER (For Faculty, Course, Ranking) */}
        {activeTab !== 'school' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab} name or code...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">School Filter:</span>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">All Schools</option>
                {schoolData.map((s) => (
                  <option key={s.school} value={s.school}>{s.school}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* REPORT CONTENT AREA */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl text-center text-xs text-slate-500">Loading evaluation reports...</div>
        ) : (
          <>
            {/* 1. SCHOOL WISE REPORT */}
            {activeTab === 'school' && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {schoolData.map((sch) => (
                  <div key={sch.school} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                        <SchoolIcon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center space-x-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                        <span className="text-sm font-black text-slate-900">{sch.avg_rating}</span>
                        <span className="text-xs text-slate-400">/ 5</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900">{sch.school}</h3>
                      <p className="text-xs text-slate-500">Department Evaluation Overview</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Faculty</p>
                        <p className="font-bold text-slate-800 text-base">{sch.total_faculty}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Submissions</p>
                        <p className="font-bold text-slate-800 text-base">{sch.total_submissions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. FACULTY WISE REPORT */}
            {activeTab === 'faculty' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
                {filteredFaculty.map((faculty) => {
                  const isExpanded = expandedFacultyId === faculty.employee_id;
                  const details = facultyDetails[faculty.employee_id];

                  return (
                    <div key={faculty.employee_id} className="transition-colors hover:bg-slate-50/50">
                      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                            {faculty.faculty_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{faculty.faculty_name}</h4>
                            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">{faculty.employee_id}</span>
                              <span>•</span>
                              <span>{faculty.school}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Submissions</p>
                            <p className="text-sm font-bold text-slate-800">{faculty.total_submissions}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Rating</p>
                            <div className="flex items-center space-x-1 justify-center">
                              <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                              <span className="text-base font-black text-slate-900">{faculty.overall_avg_rating}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => loadFacultyDetails(faculty.employee_id)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white hover:border-indigo-300 transition flex items-center space-x-1"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{isExpanded ? 'Hide' : 'Breakdown'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && details && (
                        <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-4">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">10 Criteria Breakdown</h5>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {Object.entries(CRITERIA_NAMES).map(([id, title]) => {
                              const score = details.criteriaAvg[id] || 'N/A';
                              return (
                                <div key={id} className="bg-white p-3 rounded-xl border border-slate-200">
                                  <p className="text-[10px] font-bold text-indigo-600">Criterion {id}</p>
                                  <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
                                  <p className="text-sm font-black text-slate-900 mt-1">{score} / 5</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. COURSE WISE REPORT */}
            {activeTab === 'course' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-4">Course Code</th>
                      <th className="p-4">Course Name</th>
                      <th className="p-4">School</th>
                      <th className="p-4">Programme</th>
                      <th className="p-4 text-center">Submissions</th>
                      <th className="p-4 text-center">Average Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCourses.map((crs) => (
                      <tr key={crs.course_code} className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-indigo-900">{crs.course_code}</td>
                        <td className="p-4 font-semibold text-slate-900">{crs.course_name}</td>
                        <td className="p-4">{crs.school}</td>
                        <td className="p-4 text-slate-500">{crs.programme || 'N/A'}</td>
                        <td className="p-4 text-center font-bold">{crs.total_submissions}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-full text-amber-700 font-bold border border-amber-200">
                            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                            <span>{crs.avg_rating}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. RANKING WISE REPORT */}
            {activeTab === 'ranking' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
                {rankedFaculty.map((faculty, index) => {
                  const rank = index + 1;
                  return (
                    <div key={faculty.employee_id} className="p-5 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center space-x-4">
                        {/* Rank Badge */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          rank === 1 ? 'bg-amber-400 text-amber-950 shadow-md' :
                          rank === 2 ? 'bg-slate-300 text-slate-900' :
                          rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          #{rank}
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                            <span>{faculty.faculty_name}</span>
                            {rank <= 3 && <Award className="w-4 h-4 text-amber-500" />}
                          </h4>
                          <p className="text-xs text-slate-500">{faculty.school} • {faculty.employee_id}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Evaluations</p>
                          <p className="text-xs font-bold text-slate-800">{faculty.total_submissions}</p>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl font-black text-sm">
                          <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                          <span>{faculty.overall_avg_rating}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <footer className="bg-[#520000] text-white py-4 text-center text-sm font-medium tracking-wide border-t border-[#3d0000] mt-8">
        Copyright @ 2026 &nbsp;|&nbsp; Joy University
      </footer>
    </div>
  );
}
