'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  GraduationCap, 
  Lock, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  LogOut, 
  X, 
  Send,
  User,
  Search,
  BookOpen
} from 'lucide-react';

// University Criteria List
const EVALUATION_CRITERIA = [
  {
    id: 1,
    title: "Clarity of Instruction",
    question: "How clearly does the faculty explain concepts, instructions, and expectations?"
  },
  {
    id: 2,
    title: "Subject Knowledge & Preparedness",
    question: "Is the faculty well-prepared, knowledgeable, and able to answer questions confidently?"
  },
  {
    id: 3,
    title: "Communication & Availability",
    question: "How responsive and accessible is the faculty outside class (office hours, email, LMS)?"
  },
  {
    id: 4,
    title: "Fairness in Assessment",
    question: "Are grading, exams, and assignments fair, transparent, and aligned with what was taught?"
  },
  {
    id: 5,
    title: "Teaching Style & Engagement (Interactive Panel & ICT)",
    question: "Does the faculty make classes interesting, interactive, and easy to follow using ICT tools and interactive panels?"
  },
  {
    id: 6,
    title: "Respect & Inclusivity",
    question: "Does the faculty treat all students with respect, regardless of background, gender, or ability?"
  },
  {
    id: 7,
    title: "Punctuality & Professionalism",
    question: "Does the faculty attend classes on time, follow the schedule, and conduct themselves professionally?"
  },
  {
    id: 8,
    title: "Feedback Quality",
    question: "Is the feedback on assignments/tests timely, specific, and helpful for improvement?"
  },
  {
    id: 9,
    title: "Support for Student Success",
    question: "Does the faculty encourage participation, mentor students, and support learning beyond the syllabus?"
  },
  {
    id: 10,
    title: "Overall Satisfaction",
    question: "Overall, how satisfied are you with the faculty’s teaching and conduct in this course?"
  }
];

export default function StudentPortal() {
  const [prnInput, setPrnInput] = useState('');
  const [activePRN, setActivePRN] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [submittedOfferingIds, setSubmittedOfferingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOffering, setModalOffering] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Handle Student Login (No binding required)
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanPRN = prnInput.trim().toUpperCase();
    if (!cleanPRN) return;

    setLoading(true);

    // Fetch all active faculty and course offerings in the university
    const { data: offeringsData, error: offError } = await supabase
      .from('course_offerings')
      .select(`
        id,
        courses (id, code, name),
        faculty (id, name, department)
      `);

    setLoading(false);

    if (offError) {
      alert('Error fetching course offerings: ' + offError.message);
      return;
    }

    if (!offeringsData || offeringsData.length === 0) {
      alert('No course offerings found in the system. Please ask administration to add faculty members and courses.');
      return;
    }

    setActivePRN(cleanPRN);
    setOfferings(offeringsData);
    await fetchExistingSubmissions(cleanPRN);
  };

  // Fetch Submissions to enforce single submission locking
  const fetchExistingSubmissions = async (prn) => {
    const { data: submissions } = await supabase
      .from('feedback_submissions')
      .select('course_offering_id')
      .eq('student_prn', prn);

    const lockedSet = new Set((submissions || []).map((s) => s.course_offering_id));
    setSubmittedOfferingIds(lockedSet);
  };

  // Open Evaluation Modal
  const openFeedbackModal = async (offering) => {
    const { data: existing } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('student_prn', activePRN)
      .eq('course_offering_id', offering.id)
      .maybeSingle();

    if (existing) {
      alert('Feedback has already been submitted and locked for this course offering!');
      return;
    }

    setModalOffering(offering);
    setRatings({});
    setComment('');
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    if (Object.keys(ratings).length < EVALUATION_CRITERIA.length) {
      alert('Please complete all 10 evaluation criteria before submitting.');
      return;
    }

    setSubmitting(true);

    // 1. Insert Feedback Header
    const { data: sub, error } = await supabase
      .from('feedback_submissions')
      .insert([{ student_prn: activePRN, course_offering_id: modalOffering.id, comment }])
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      if (error.code === '23505') {
        alert('Feedback has already been submitted and locked for this instructor!');
      } else {
        alert('Submission failed: ' + error.message);
      }
      setModalOffering(null);
      return;
    }

    // 2. Insert All Ratings
    const ratingsPayload = Object.entries(ratings).map(([critId, rating]) => ({
      submission_id: sub.id,
      criteria_id: parseInt(critId),
      rating: parseInt(rating)
    }));

    await supabase.from('feedback_ratings').insert(ratingsPayload);

    setSubmitting(false);
    setModalOffering(null);
    alert('Feedback submitted and locked successfully!');
    await fetchExistingSubmissions(activePRN);
  };

  const logout = () => {
    setActivePRN(null);
    setPrnInput('');
    setOfferings([]);
    setSearchQuery('');
  };

  // Filter offerings based on student search input
  const filteredOfferings = offerings.filter((off) => {
    const q = searchQuery.toLowerCase();
    const courseCode = off.courses?.code?.toLowerCase() || '';
    const courseName = off.courses?.name?.toLowerCase() || '';
    const facultyName = off.faculty?.name?.toLowerCase() || '';
    const dept = off.faculty?.department?.toLowerCase() || '';
    return courseCode.includes(q) || courseName.includes(q) || facultyName.includes(q) || dept.includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white text-indigo-900 p-2 rounded-xl font-black text-xl tracking-wider shadow">
              JU
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Joy University</h1>
              <p className="text-xs text-indigo-200 tracking-wide">Student Feedback Portal</p>
            </div>
          </div>

          {activePRN && (
            <div className="flex items-center space-x-4 border-l border-indigo-700 pl-4">
              <div className="text-right">
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Active PRN</p>
                <p className="text-xs font-bold text-white font-mono">{activePRN}</p>
              </div>
              <button onClick={logout} className="bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5">
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activePRN ? (
          /* LOGIN SCREEN */
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-indigo-900">Student Portal Access</h2>
                <p className="text-xs text-slate-500">Enter your PRN to view and evaluate courses</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Permanent Registration Number (PRN)</label>
                <input
                  type="text"
                  value={prnInput}
                  onChange={(e) => setPrnInput(e.target.value)}
                  required
                  placeholder="Enter your PRN (e.g. 2024BTAM001)"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none transition uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Accessing...' : 'Access Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 bg-indigo-700/60 px-3 py-1 rounded-full text-xs font-medium text-indigo-100 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active Term: Faculty Feedback Session</span>
                </div>
                <h2 className="text-2xl font-bold">Faculty Evaluation Portal</h2>
                <p className="text-indigo-200 text-xs">Select your instructors and courses below. Feedback locks immediately after submission.</p>
              </div>
              <div className="bg-indigo-950/60 p-4 rounded-xl border border-indigo-700/50">
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Active Session</p>
                <p className="text-sm font-bold font-mono text-white mt-0.5">{activePRN}</p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search course code, name, or faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredOfferings.length}</strong> available course offerings
              </div>
            </div>

            {/* Offerings Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOfferings.map((off) => {
                const isLocked = submittedOfferingIds.has(off.id);
                const courseCode = off.courses?.code || 'COURSE';
                const courseName = off.courses?.name || 'Course Subject';
                const facultyName = off.faculty?.name || 'Faculty Member';
                const department = off.faculty?.department || 'General';

                return (
                  <div
                    key={off.id}
                    className={`bg-white rounded-2xl p-6 border ${
                      isLocked ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    } shadow-xs flex flex-col justify-between transition-all`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isLocked ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}`}>
                          {courseCode}
                        </span>
                        {isLocked ? (
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>Locked & Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base leading-snug">{courseName}</h4>
                        <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Faculty: <strong className="text-slate-700">{facultyName}</strong> ({department})</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {isLocked ? (
                        <button disabled className="w-full bg-slate-100 text-slate-400 font-semibold px-4 py-2.5 rounded-xl text-xs cursor-not-allowed flex items-center justify-center space-x-2 border border-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Feedback Submitted & Locked</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openFeedbackModal(off)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center space-x-1.5"
                        >
                          <span>Evaluate Instructor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* EVALUATION MODAL */}
      {modalOffering && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            <div className="bg-indigo-900 text-white p-6 sticky top-0 z-10 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{modalOffering.courses?.name} ({modalOffering.courses?.code})</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Faculty Member: {modalOffering.faculty?.name}</p>
              </div>
              <button onClick={() => setModalOffering(null)} className="w-8 h-8 rounded-full bg-indigo-800 hover:bg-indigo-700 flex items-center justify-center text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="p-6 space-y-6">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-bold mb-1 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 mr-1" /> Single Submission Notice
                </p>
                Once submitted, your feedback for this instructor is locked and cannot be edited or resubmitted.
              </div>

              {/* 10 Evaluation Criteria List */}
              <div className="space-y-5">
                {EVALUATION_CRITERIA.map((crit) => (
                  <div key={crit.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Criterion {crit.id} of 10
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 mt-1">{crit.title}</h5>
                      <p className="text-xs text-slate-600">{crit.question}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <label key={r} className="flex-1 text-center bg-white border border-slate-200 rounded-lg py-2.5 px-1 cursor-pointer hover:border-indigo-400 transition">
                          <input
                            type="radio"
                            name={`crit_${crit.id}`}
                            value={r}
                            required
                            onChange={(e) => setRatings({ ...ratings, [crit.id]: e.target.value })}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="block text-xs font-bold text-slate-800 mt-1">{r}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                      <span>Poor (1)</span>
                      <span>Average (3)</span>
                      <span>Outstanding (5)</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Optional Qualitative Feedback / Comments</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Constructive suggestions or feedback regarding teaching methods..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOffering(null)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting & Locking...' : 'Submit & Lock Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
