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
  School,
  Filter,
  CheckCircle2
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
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [expandedFacultyId, setExpandedFacultyId] = useState(null);
  const [facultyDetails, setFacultyDetails] = useState({});
  const [selectedComments, setSelectedComments] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('instructor_analytics')
      .select('*')
      .order('overall_avg_rating', { ascending: false });

    if (error) {
      console.error('Error fetching analytics:', error);
    } else {
      setAnalytics(data || []);
    }
    setLoading(false);
  };

  // Fetch criteria breakdown and comments for an expanded faculty member
  const loadFacultyDetails = async (employeeId) => {
    if (facultyDetails[employeeId]) {
      setExpandedFacultyId(expandedFacultyId === employeeId ? null : employeeId);
      return;
    }

    // Fetch offering IDs for this faculty
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

    // Fetch submissions & comments
    const { data: submissions } = await supabase
      .from('feedback_submissions')
      .select('id, comment, created_at, course_offering_id')
      .in('course_offering_id', offeringIds);

    const submissionIds = (submissions || []).map((s) => s.id);
    const commentsList = (submissions || []).filter((s) => s.comment && s.comment.trim() !== '');

    // Fetch criteria ratings
    let criteriaAvg = {};
    if (submissionIds.length > 0) {
      const { data: ratings } = await supabase
        .from('feedback_ratings')
        .select('criteria_id, rating')
        .in('submission_id', submissionIds);

      // Aggregate criteria averages
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

  // Filter options
  const schools = ['ALL', ...Array.from(new Set(analytics.map((a) => a.school).filter(Boolean)))];

  const filteredAnalytics = analytics.filter((item) => {
    const matchesSearch =
      item.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = selectedSchool === 'ALL' || item.school === selectedSchool;
    return matchesSearch && matchesSchool;
  });

  // Calculate platform summary numbers
  const totalSubmissions = analytics.reduce((acc, cur) => acc + (cur.total_submissions || 0), 0);
  const avgPlatformRating = (
    analytics.reduce((acc, cur) => acc + (parseFloat(cur.overall_avg_rating) || 0), 0) /
    (analytics.filter((a) => a.total_submissions > 0).length || 1)
  ).toFixed(2);

  // Export CSV Functionality
  const exportToCSV = () => {
    const headers = ['Employee ID,Faculty Name,School,Total Submissions,Average Rating\n'];
    const rows = filteredAnalytics.map(
      (a) => `"${a.employee_id}","${a.faculty_name}","${a.school}",${a.total_submissions},${a.overall_avg_rating}`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Faculty_Feedback_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white text-indigo-900 p-2 rounded-xl font-black text-xl tracking-wider shadow">
              JU
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Joy University</h1>
              <p className="text-xs text-indigo-200 tracking-wide">Admin Analytics Dashboard</p>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Instructors</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{analytics.length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Evaluated Courses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalSubmissions}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Star className="w-6 h-6 fill-amber-400 stroke-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">University Average</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{avgPlatformRating} / 5.00</h3>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by instructor name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">School:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {schools.map((sch) => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Analytics Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Instructor Average Rating Report</h2>
            <span className="text-xs text-slate-500 font-semibold">{filteredAnalytics.length} Instructors Listed</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading evaluation reports...</div>
          ) : filteredAnalytics.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No instructor data matches the selected filters.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAnalytics.map((faculty) => {
                const isExpanded = expandedFacultyId === faculty.employee_id;
                const details = facultyDetails[faculty.employee_id];

                return (
                  <div key={faculty.employee_id} className="transition-colors hover:bg-slate-50/50">
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Instructor Info */}
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {faculty.faculty_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{faculty.faculty_name}</h4>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">{faculty.employee_id}</span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <School className="w-3 h-3 text-slate-400" />
                              <span>{faculty.school}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Submissions</p>
                          <p className="text-sm font-bold text-slate-800">{faculty.total_submissions}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Avg Rating</p>
                          <div className="flex items-center space-x-1 justify-center mt-0.5">
                            <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                            <span className="text-base font-black text-slate-900">{faculty.overall_avg_rating}</span>
                            <span className="text-xs text-slate-400">/ 5</span>
                          </div>
                        </div>

                        <button
                          onClick={() => loadFacultyDetails(faculty.employee_id)}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white hover:border-indigo-300 transition flex items-center space-x-1"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isExpanded ? 'Hide Details' : 'Breakdown'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                        </button>
                      </div>
                    </div>

                    {/* Detailed Criteria Breakdown */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 p-6 border-t border-slate-200 space-y-6">
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Performance Across 10 Evaluation Criteria</h5>
                          {details && details.criteriaAvg && Object.keys(details.criteriaAvg).length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              {Object.entries(CRITERIA_NAMES).map(([id, title]) => {
                                const score = details.criteriaAvg[id] || 'N/A';
                                const pct = score !== 'N/A' ? (parseFloat(score) / 5) * 100 : 0;

                                return (
                                  <div key={id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Criterion {id}</p>
                                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">{title}</p>
                                    <div className="flex items-center justify-between pt-1">
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mr-2">
                                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                      </div>
                                      <span className="text-xs font-black text-slate-900">{score}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No detailed evaluations submitted yet.</p>
                          )}
                        </div>

                        {/* Comments Section */}
                        {details && details.comments && details.comments.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Anonymous Student Comments ({details.comments.length})</span>
                              </h5>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                              {details.comments.map((c, i) => (
                                <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 italic">
                                  "{c.comment}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
