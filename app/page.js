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
  ChalkboardUser
} from 'lucide-react';

export default function StudentPortal() {
  const [prnInput, setPrnInput] = useState('');
  const [activePRN, setActivePRN] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [submittedOfferingIds, setSubmittedOfferingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOffering, setModalOffering] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Handle Student PRN Login
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanPRN = prnInput.trim().toUpperCase();
    if (!cleanPRN) return;

    setLoading(true);
    const { data: enrollments, error } = await supabase
      .from('student_enrollments')
      .select(`
        course_offering_id,
        course_offerings (
          id,
          courses (code, name),
          faculty (name, department)
        )
      `)
      .eq('student_prn', cleanPRN);

    setLoading(false);

    if (error) {
      alert('Error fetching records: ' + error.message);
      return;
    }

    if (!enrollments || enrollments.length === 0) {
      alert(`No mapped faculty forms found for PRN: ${cleanPRN}. Please contact administration.`);
      return;
    }

    setActivePRN(cleanPRN);
    setMappings(enrollments);
    await fetchExistingSubmissions(cleanPRN);
  };

  // Fetch Existing Submissions to Lock Completed Forms
  const fetchExistingSubmissions = async (prn) => {
    const { data: submissions } = await supabase
      .from('feedback_submissions')
      .select('course_offering_id')
      .eq('student_prn', prn);

    const lockedSet = new Set((submissions || []).map((s) => s.course_offering_id));
    setSubmittedOfferingIds(lockedSet);
  };

  // Open Feedback Modal
  const openFeedbackModal = async (offering) => {
    // Check if locked
    const { data: existing } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('student_prn', activePRN)
      .eq('course_offering_id', offering.id)
      .maybeSingle();

    if (existing) {
      alert('Feedback has already been submitted and locked for this course!');
      return;
    }

    setModalOffering(offering);
    setRatings({});
    setComment('');

    // Fetch Criteria Questions
    let { data: critData } = await supabase.from('criteria').select('*');
    if (!critData || critData.length === 0) {
      critData = [
        { id: 1, question: 'Teacher comes to class prepared and organized.' },
        { id: 2, question: 'Teacher explains concepts clearly and effectively.' },
        { id: 3, question: 'Teacher encourages questions and student interaction.' },
        { id: 4, question: 'Punctuality and syllabus completion pace.' }
      ];
    }
    setCriteria(critData);
  };

  // Handle Feedback Submission
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (Object.keys(ratings).length < criteria.length) {
      alert('Please answer all rating criteria before submitting.');
      return;
    }

    setSubmitting(true);

    // 1. Insert Feedback Submission
    const { data: sub, error } = await supabase
      .from('feedback_submissions')
      .insert([{ student_prn: activePRN, course_offering_id: modalOffering.id, comment }])
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      if (error.code === '23505') {
        alert('Feedback has already been submitted and locked for this course offering.');
      } else {
        alert('Submission failed: ' + error.message);
      }
      setModalOffering(null);
      return;
    }

    // 2. Insert Ratings Payload
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
    setMappings([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header Navigation */}
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

      {/* Main Content Area */}
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
                <p class="text-xs text-slate-500">Enter your PRN to view mapped feedback forms</p>
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
                  placeholder="e.g. 2024BTAM330"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none transition uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Validating...' : 'Access Forms'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
              Demo PRN: <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded">2024BTAM330</span>
            </div>
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 bg-indigo-700/60 px-3 py-1 rounded-full text-xs font-medium text-indigo-100 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active Term: Feedback Session</span>
                </div>
                <h2 className="text-2xl font-bold">Assigned Faculty Feedback Forms</h2>
                <p className="text-indigo-200 text-xs">Each course form can only be submitted once per PRN and locks upon completion.</p>
              </div>
              <div className="bg-indigo-950/60 p-4 rounded-xl border border-indigo-700/50">
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Active Session</p>
                <p className="text-sm font-bold font-mono text-white mt-0.5">{activePRN}</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mappings.map((item) => {
                const off = item.course_offerings;
                if (!off) return null;

                const isLocked = submittedOfferingIds.has(off.id);
                const courseCode = off.courses?.code || 'COURSE';
                const courseName = off.courses?.name || 'Course Name';
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
                          <ChalkboardUser className="w-3.5 h-3.5 text-indigo-500" />
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
                          <span>Provide Feedback</span>
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
                <h3 className="text-xl font-bold">{modalOffering.courses?.name}</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Faculty: {modalOffering.faculty?.name}</p>
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

              <div className="space-y-4">
                {criteria.map((crit, idx) => (
                  <div key={crit.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">{idx + 1}. {crit.question}</label>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <label key={r} className="flex-1 text-center bg-white border border-slate-200 rounded-lg py-2 px-1 cursor-pointer hover:border-indigo-400 transition">
                          <input
                            type="radio"
                            name={`crit_${crit.id}`}
                            value={r}
                            required
                            onChange={(e) => setRatings({ ...ratings, [crit.id]: e.target.value })}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="block text-xs font-bold text-slate-700 mt-1">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Optional Comments / Feedback</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Constructive comments or suggestions..."
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
                  <span>{submitting ? 'Locking...' : 'Submit & Lock Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}