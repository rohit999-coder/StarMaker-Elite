
import React, { useState, useEffect } from 'react';
import { FormData, FormStep, AIReviewResult, SavedRecord, UserRole, EvaluationOrder, JudgeRecord } from './types';
import { analyzeApplication } from './services/geminiService';

const ADMIN_PASS = "1234";

const initialFormData: FormData = {
  singerName: '',
  singerId: '',
  dp: '',
};

const App: React.FC = () => {
  const [step, setStep] = useState<FormStep>('LANDING');
  const [role, setRole] = useState<UserRole>('GUEST');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [judges, setJudges] = useState<JudgeRecord[]>([]);
  const [activeSingerId, setActiveSingerId] = useState<string | null>(null);
  const [activeJudgeId, setActiveJudgeId] = useState<string | null>(null);
  
  // Tabs for Admin
  const [adminTab, setAdminTab] = useState<'SINGERS' | 'JUDGES'>('SINGERS');

  // Auth states
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Editing States
  const [adminEditingId, setAdminEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editSID, setEditSID] = useState('');

  // Modals
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newSingerInfo, setNewSingerInfo] = useState<{ id: string, pass: string } | null>(null);
  const [newJudgeInfo, setNewJudgeInfo] = useState<{ id: string, pass: string } | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('Standard Performance');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('');

  // Judge Marking States
  const [markingOrderId, setMarkingOrderId] = useState<string | null>(null);
  const [markingSingerId, setMarkingSingerId] = useState<string | null>(null);
  const [tempMark, setTempMark] = useState<string>('');

  // Initial load
  useEffect(() => {
    const savedRecords = localStorage.getItem('starmaker_v4_records');
    const savedJudges = localStorage.getItem('starmaker_v4_judges');
    
    const parsedRecords = savedRecords ? JSON.parse(savedRecords) : [];
    const parsedJudges = savedJudges ? JSON.parse(savedJudges) : [];
    
    setRecords(parsedRecords);
    setJudges(parsedJudges);

    const savedSession = localStorage.getItem('starmaker_session');
    if (savedSession) {
      const { role: savedRole, activeId } = JSON.parse(savedSession);
      if (savedRole === 'SINGER' && activeId) {
        const singer = parsedRecords.find((r: SavedRecord) => r.id === activeId);
        if (singer && !singer.isBanned) {
          setRole('SINGER');
          setActiveSingerId(activeId);
          setFormData({ singerName: singer.singerName, singerId: singer.singerId, dp: singer.dp });
          setStep('SINGER_HOME');
        }
      } else if (savedRole === 'JUDGE' && activeId) {
        const judge = parsedJudges.find((j: JudgeRecord) => j.id === activeId);
        if (judge) {
          setRole('JUDGE');
          setActiveJudgeId(activeId);
          setStep('JUDGE_VIEW');
        }
      } else if (savedRole === 'ADMIN') {
        setRole('ADMIN');
        setStep('RECORDS');
      }
    }
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('starmaker_v4_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('starmaker_v4_judges', JSON.stringify(judges));
  }, [judges]);

  // Auth Handler
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (role === 'ADMIN') {
      if (loginPass === ADMIN_PASS) {
        setStep('RECORDS');
        localStorage.setItem('starmaker_session', JSON.stringify({ role: 'ADMIN' }));
      } else {
        setLoginError("Invalid password");
      }
    } else if (role === 'JUDGE') {
      const judge = judges.find(j => j.judgeId === loginId && j.password === loginPass);
      if (judge) {
        setActiveJudgeId(judge.id);
        setStep('JUDGE_VIEW');
        localStorage.setItem('starmaker_session', JSON.stringify({ role: 'JUDGE', activeId: judge.id }));
      } else {
        setLoginError("Invalid Judge ID or Password");
      }
    } else if (role === 'SINGER') {
      const singer = records.find(r => r.singerId === loginId && r.password === loginPass);
      if (singer) {
        if (singer.isBanned) {
          setLoginError("This account is suspended.");
          return;
        }
        setActiveSingerId(singer.id);
        setFormData({ singerName: singer.singerName, singerId: singer.singerId, dp: singer.dp });
        setStep('SINGER_HOME');
        localStorage.setItem('starmaker_session', JSON.stringify({ role: 'SINGER', activeId: singer.id }));
      } else {
        setLoginError("Invalid credentials");
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('starmaker_session');
    setRole('GUEST');
    setStep('LANDING');
    setLoginId('');
    setLoginPass('');
    setActiveSingerId(null);
    setActiveJudgeId(null);
    setFormData(initialFormData);
    setLoginError(null);
  };

  // Admin Actions
  const createSingerAccount = () => {
    const newId = `SM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass = Math.floor(1000 + Math.random() * 9000).toString();
    const newAccount: SavedRecord = {
      id: crypto.randomUUID(),
      singerName: '',
      singerId: newId,
      password: newPass,
      dp: '',
      submittedAt: new Date().toISOString(),
      isProfileSet: false,
      isOnline: false,
      isBanned: false,
      orders: []
    };
    setRecords(prev => [newAccount, ...prev]);
    setNewSingerInfo({ id: newId, pass: newPass });
  };

  const createJudgeAccount = () => {
    const newId = `JDG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass = Math.floor(1000 + Math.random() * 9000).toString();
    const newJudge: JudgeRecord = {
      id: crypto.randomUUID(),
      judgeId: newId,
      password: newPass,
      name: `Specialist ${judges.length + 1}`
    };
    setJudges(prev => [...prev, newJudge]);
    setNewJudgeInfo({ id: newId, pass: newPass });
  };

  const assignOrder = (singerId: string) => {
    if (!selectedJudgeId) {
      alert("Please select a judge first.");
      return;
    }
    const newOrder: EvaluationOrder = {
      id: crypto.randomUUID(),
      singerId: singerId,
      assignedJudgeId: selectedJudgeId,
      assignedAt: new Date().toISOString(),
      status: 'PENDING',
      taskTitle: taskTitle
    };
    setRecords(prev => prev.map(r => r.id === singerId ? { ...r, orders: [newOrder, ...(r.orders || [])] } : r));
    setAssigningId(null);
    setTaskTitle('Standard Performance');
    setSelectedJudgeId('');
  };

  const deleteJudge = (id: string) => {
    if(confirm("Erase this Judge's access?")) {
      setJudges(prev => prev.filter(j => j.id !== id));
    }
  };

  const saveOrderMark = (singerId: string, orderId: string) => {
    const score = parseInt(tempMark);
    if (isNaN(score) || score < 0 || score > 100) return;
    setRecords(prev => prev.map(r => {
      if (r.id === singerId) {
        const updatedOrders: EvaluationOrder[] = (r.orders || []).map(o => 
          o.id === orderId ? { ...o, status: 'COMPLETED' as const, score } : o
        );
        return { ...r, orders: updatedOrders, judgeMark: score };
      }
      return r;
    }));
    setMarkingOrderId(null);
    setMarkingSingerId(null);
    setTempMark('');
  };

  const toggleSingerStatus = () => {
    if (!activeSingerId) return;
    setRecords(prev => prev.map(r => 
      r.id === activeSingerId ? { ...r, isOnline: !r.isOnline } : r
    ));
  };

  const deleteSinger = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
  };

  const startAdminEdit = (id: string, currentRole: 'SINGER' | 'JUDGE') => {
    setAdminEditingId(id);
    if (currentRole === 'SINGER') {
      const singer = records.find(r => r.id === id);
      if (singer) {
        setEditName(singer.singerName);
        setEditSID(singer.singerId);
        setEditPass(singer.password);
      }
    } else {
      const judge = judges.find(j => j.id === id);
      if (judge) {
        setEditName(judge.name);
        setEditSID(judge.judgeId);
        setEditPass(judge.password);
      }
    }
  };

  const saveAdminEdit = () => {
    if (!adminEditingId) return;
    if (adminTab === 'SINGERS') {
      setRecords(prev => prev.map(r => 
        r.id === adminEditingId ? { ...r, singerName: editName, singerId: editSID, password: editPass } : r
      ));
    } else {
      setJudges(prev => prev.map(j => 
        j.id === adminEditingId ? { ...j, name: editName, judgeId: editSID, password: editPass } : j
      ));
    }
    setAdminEditingId(null);
  };

  // Modals
  const renderDeleteModal = () => {
    if (!deletingId) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-8 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-900">Delete Artist?</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase">This will erase all profile data permanently.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => deleteSinger(deletingId)} className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Delete</button>
            <button onClick={() => setDeletingId(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminEditModal = () => {
    if (!adminEditingId) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-8 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-900">Edit {adminTab === 'SINGERS' ? 'Singer' : 'Judge'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Update Access Credentials</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">Name</label>
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">Unique ID</label>
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono font-black text-sm outline-none" value={editSID} onChange={(e) => setEditSID(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">Password</label>
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono font-black text-indigo-600 text-sm outline-none tracking-widest" value={editPass} onChange={(e) => setEditPass(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveAdminEdit} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-200">Save Changes</button>
            <button onClick={() => setAdminEditingId(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const renderNewSingerModal = () => {
    if (!newSingerInfo) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="bg-rose-600 p-8 text-center text-white">
            <h3 className="text-2xl font-black">Singer Created!</h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Singer ID</label>
                <p className="text-xl font-mono font-black text-slate-900">{newSingerInfo.id}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Passkey</label>
                <p className="text-xl font-mono font-black text-rose-600">{newSingerInfo.pass}</p>
              </div>
            </div>
            <button onClick={() => setNewSingerInfo(null)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl">Dismiss</button>
          </div>
        </div>
      </div>
    );
  };

  const renderNewJudgeModal = () => {
    if (!newJudgeInfo) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <h3 className="text-2xl font-black">Judge Created!</h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Judge ID</label>
                <p className="text-xl font-mono font-black text-slate-900">{newJudgeInfo.id}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Passkey</label>
                <p className="text-xl font-mono font-black text-indigo-600">{newJudgeInfo.pass}</p>
              </div>
            </div>
            <button onClick={() => setNewJudgeInfo(null)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl">Dismiss</button>
          </div>
        </div>
      </div>
    );
  };

  const renderAssignModal = () => {
    if (!assigningId) return null;
    const target = records.find(r => r.id === assigningId);
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-8 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-900">New Audition Task</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">Assignment for {target?.singerName || target?.singerId}</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">Performance Title</label>
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">Assign to Judge</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none cursor-pointer"
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
              >
                <option value="">Select a Judge...</option>
                {judges.map(j => (
                  <option key={j.id} value={j.id}>{j.name} ({j.judgeId})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => assignOrder(assigningId)} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg">Assign Now</button>
            <button onClick={() => setAssigningId(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const activeSingerRecord = records.find(r => r.id === activeSingerId);
  const activeJudgeRecord = judges.find(j => j.id === activeJudgeId);

  // Main UI Renders
  const renderLanding = () => (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-indigo-600">StarMaker Universe</h1>
        <p className="text-slate-500 font-medium tracking-wide">Secure Audition & Talent Management</p>
      </div>
      <div className="grid gap-4">
        {[
          { r: 'SINGER', t: 'Artist Entry', d: 'Setup identity & view scores', c: 'rose' },
          { r: 'JUDGE', t: 'Elite Judge', d: 'Review assigned performance', c: 'indigo' },
          { r: 'ADMIN', t: 'Registry Root', d: 'Manage global talent network', c: 'slate' }
        ].map(item => (
          <button key={item.r} onClick={() => { setRole(item.r as UserRole); setStep('LOGIN'); }} className={`group p-6 bg-white border border-slate-100 rounded-[2.5rem] hover:shadow-2xl transition-all flex items-center space-x-6 text-left`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform ${item.c === 'rose' ? 'bg-rose-50 text-rose-600' : item.c === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
              <span className="font-black text-xl">{item.r[0]}</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">{item.t}</h3>
              <p className="text-xs text-slate-400 font-medium">{item.d}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderAdminView = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
        <button onClick={() => setAdminTab('SINGERS')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'SINGERS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Singer Registry</button>
        <button onClick={() => setAdminTab('JUDGES')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'JUDGES' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Judge Network</button>
      </div>

      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{adminTab === 'SINGERS' ? 'Active Artists' : 'Certified Judges'}</h2>
        <button onClick={adminTab === 'SINGERS' ? createSingerAccount : createJudgeAccount} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">
          {adminTab === 'SINGERS' ? '+ New ID' : '+ New Judge'}
        </button>
      </div>

      <div className="grid gap-4">
        {adminTab === 'SINGERS' ? (
          records.length === 0 ? <p className="text-center py-16 text-slate-300 font-bold uppercase tracking-widest text-xs italic">Registry Empty</p> : 
          records.map(r => (
            <div key={r.id} className="bg-white border border-slate-100 p-5 rounded-[2.5rem] shadow-sm flex items-center space-x-5 transition-all hover:shadow-xl hover:border-slate-200">
              <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border overflow-hidden flex items-center justify-center shadow-inner">
                {r.dp ? <img src={r.dp} className="w-full h-full object-cover" /> : <span className="text-xs font-black text-slate-200">?</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-900 truncate text-lg">{r.singerName || 'New Talent'}</h4>
                <div className="flex flex-col space-y-1.5 mt-1.5">
                  <div className="flex space-x-2">
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono tracking-widest">ID: {r.singerId}</span>
                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 font-mono tracking-widest">PW: {r.password}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orders: {(r.orders || []).length}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <button onClick={() => setAssigningId(r.id)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Assign Order"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg></button>
                <button onClick={() => startAdminEdit(r.id, 'SINGER')} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors" title="Edit Access"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button onClick={() => setDeletingId(r.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Delete"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
          ))
        ) : (
          judges.length === 0 ? <p className="text-center py-16 text-slate-300 font-bold uppercase tracking-widest text-xs italic">No Judges Listed</p> :
          judges.map(j => (
            <div key={j.id} className="bg-white border border-slate-100 p-5 rounded-[2.5rem] shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
              <div>
                <h4 className="font-black text-slate-900 text-lg">{j.name}</h4>
                <div className="flex flex-col space-y-1.5 mt-1.5">
                  <div className="flex space-x-2">
                    <span className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border font-mono">ID: {j.judgeId}</span>
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono">PW: {j.password}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <button onClick={() => startAdminEdit(j.id, 'JUDGE')} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button onClick={() => deleteJudge(j.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderJudgeView = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Assigned Auditions</h2>
        <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-1 italic">Welcome Judge: {activeJudgeRecord?.name}</p>
      </div>

      <div className="grid gap-4">
        {records.flatMap(r => (r.orders || []).map(o => ({ ...o, singer: r }))).filter(o => o.assignedJudgeId === activeJudgeId && o.status === 'PENDING').length === 0 ? (
          <div className="py-16 text-center bg-indigo-50/20 border-2 border-dashed border-indigo-100 rounded-[3rem]">
            <p className="text-indigo-400 font-bold text-sm uppercase tracking-widest px-8">All assigned tasks completed.</p>
          </div>
        ) : (
          records.flatMap(r => (r.orders || []).map(o => ({ ...o, singer: r })))
            .filter(o => o.assignedJudgeId === activeJudgeId && o.status === 'PENDING')
            .map(order => (
              <div key={order.id} className={`bg-white border p-6 rounded-[2.5rem] transition-all ${markingOrderId === order.id ? 'border-indigo-400 ring-4 ring-indigo-50 shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-xl'}`}>
                {markingOrderId === order.id ? (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border">
                        <img src={order.singer.dp} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg">{order.singer.singerName}</h3>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{order.taskTitle}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Assign Score (0-100)</label>
                      <input type="number" autoFocus className="w-full px-6 py-5 bg-slate-50 border border-indigo-100 rounded-2xl text-4xl font-black text-center text-indigo-600 focus:bg-white outline-none" value={tempMark} onChange={(e) => setTempMark(e.target.value)} placeholder="0" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => saveOrderMark(order.singer.id, order.id)} className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Submit Result</button>
                      <button onClick={() => setMarkingOrderId(null)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 border overflow-hidden flex-shrink-0 relative shadow-inner">
                      <img src={order.singer.dp} className="w-full h-full object-cover" />
                      <div className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${order.singer.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 opacity-50'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 truncate text-lg">{order.singer.singerName}</h3>
                      <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{order.taskTitle}</p>
                      <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Artist ID: {order.singer.singerId}</p>
                    </div>
                    <button onClick={() => { setMarkingOrderId(order.id); setMarkingSingerId(order.singer.id); }} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-600 hover:text-white transition-all group shadow-sm">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col selection:bg-rose-100 font-sans text-slate-900">
      {renderDeleteModal()}
      {renderAdminEditModal()}
      {renderAssignModal()}
      {renderNewSingerModal()}
      {renderNewJudgeModal()}
      
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-6 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={logout}>
            <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-2xl transition-all group-hover:bg-indigo-600 group-hover:rotate-12">
              <span className="text-white font-black text-2xl tracking-tighter">S</span>
            </div>
            <span className="text-2xl font-black tracking-tighter">StarMaker <span className="text-indigo-600">Pro</span></span>
          </div>
          {step !== 'LANDING' && step !== 'LOGIN' && (
            <button onClick={logout} className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 shadow-sm">Sign Out</button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex justify-center p-6 md:p-12">
        <div className="w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl overflow-hidden self-start border border-slate-100/60 p-1 md:p-2">
          <div className="p-8 md:p-12">
            {step === 'LANDING' && renderLanding()}
            
            {step === 'LOGIN' && (
              <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
                <div className="text-center">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">{role} Access</h2>
                  <p className="text-slate-400 font-medium mt-3 text-lg">Enter your credentials to enter the network</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-5">
                  {(role === 'SINGER' || role === 'JUDGE') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-3">{role} ID</label>
                      <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full px-7 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-mono text-lg transition-all" placeholder={`${role === 'SINGER' ? 'SM' : 'JDG'}-XXXX`} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-3">Access Key</label>
                    <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full px-7 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none text-lg transition-all" placeholder="••••••••" />
                  </div>
                  {loginError && <p className="text-xs text-rose-600 font-black uppercase text-center mt-3 animate-pulse">{loginError}</p>}
                  <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all mt-6 hover:bg-black">Identify Profile</button>
                </form>
                <button onClick={() => setStep('LANDING')} className="w-full text-slate-400 text-[10px] font-black hover:text-slate-600 uppercase tracking-[0.4em]">Switch Account Type</button>
              </div>
            )}

            {step === 'RECORDS' && renderAdminView()}
            {step === 'JUDGE_VIEW' && renderJudgeView()}
            {step === 'SINGER_HOME' && renderSingerHome()}
          </div>
        </div>
      </main>

      <footer className="py-12 text-center text-[10px] font-black uppercase tracking-[0.6em] text-slate-300">
        Global Talent Infrastructure • 2025
      </footer>
    </div>
  );

  // Helper render for Singer Dashboard
  function renderSingerHome() {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row items-center sm:space-x-8 p-10 bg-gradient-to-br from-indigo-700 to-indigo-950 rounded-[4rem] text-white shadow-[0_32px_64px_-16px_rgba(30,27,75,0.4)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="relative">
            {/* Pulsing Status Ring */}
            {activeSingerRecord?.isOnline && (
              <div className="absolute inset-0 rounded-[2.5rem] border-4 border-emerald-400/30 animate-ping" />
            )}
            
            <div className={`w-28 h-28 rounded-[2.5rem] overflow-hidden flex-shrink-0 flex items-center justify-center border-4 relative z-10 transition-all duration-500 shadow-2xl ${activeSingerRecord?.isOnline ? 'border-emerald-400 scale-105' : 'border-white/10'}`}>
              {activeSingerRecord?.dp ? (
                <img src={activeSingerRecord.dp} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-800/50 flex items-center justify-center">
                   <span className="text-6xl font-black opacity-20">?</span>
                </div>
              )}
              
              {/* LIVE Badge on DP */}
              {activeSingerRecord?.isOnline && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce uppercase">Live</div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 mt-6 sm:mt-0 text-center sm:text-left">
            <h2 className="text-4xl font-black tracking-tighter truncate">{activeSingerRecord?.singerName || 'Untitled Artist'}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
               <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em]">Registry: {activeSingerRecord?.singerId}</p>
               <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border transition-all ${activeSingerRecord?.isOnline ? 'bg-emerald-500/20 border-emerald-400/20 text-emerald-400' : 'bg-rose-500/20 border-rose-400/20 text-rose-400'}`}>
                 Network: {activeSingerRecord?.isOnline ? 'Broadcasting' : 'Stealth Mode'}
               </span>
            </div>
          </div>

          <button 
            onClick={toggleSingerStatus} 
            className={`mt-8 sm:mt-0 flex items-center space-x-4 px-6 py-4 rounded-[2rem] border-2 transition-all active:scale-95 group/btn ${
              activeSingerRecord?.isOnline 
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                : 'bg-black/30 border-white/5 text-white/40 grayscale hover:grayscale-0'
            }`}
          >
            <div className={`w-4 h-4 rounded-full transition-all shadow-inner ${activeSingerRecord?.isOnline ? 'bg-emerald-400 shadow-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">{activeSingerRecord?.isOnline ? 'Go Offline' : 'Go Live'}</span>
          </button>
        </div>

        <div className="space-y-8 mt-12 px-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Current Performance Queue</h3>
            <div className="flex items-center space-x-2">
               <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Sync Active</span>
            </div>
          </div>
          
          {(!activeSingerRecord?.orders || activeSingerRecord.orders.length === 0) ? (
            <div className="py-24 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[4rem] text-center px-12 group/empty transition-all hover:bg-indigo-50/30">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover/empty:scale-110 transition-transform">
                <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Awaiting Assignments</p>
              <p className="text-slate-300 text-[10px] mt-3 font-medium tracking-wide">Your specialist will assign tasks to this profile shortly.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {activeSingerRecord.orders.map(order => (
                <div key={order.id} className="p-8 bg-white border border-slate-100 rounded-[3.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center justify-between transition-all hover:shadow-2xl hover:border-indigo-100 group cursor-default">
                  <div className="flex items-center space-x-6 text-center md:text-left">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xl tracking-tight group-hover:text-indigo-700 transition-colors">{order.taskTitle}</h4>
                      <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">
                        Assigned: <span className="text-slate-600 font-bold">{new Date(order.assignedAt).toLocaleDateString()}</span> • Specialist: <span className="text-indigo-600 font-black">{judges.find(j => j.id === order.assignedJudgeId)?.name || 'Auditor'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 md:mt-0">
                    {order.status === 'COMPLETED' ? (
                      <div className="bg-emerald-50 border border-emerald-100 px-8 py-3 rounded-[2rem] flex items-center space-x-4 shadow-sm">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Certified Result</p>
                          <p className="text-3xl font-black text-emerald-600 leading-none mt-1">{order.score}<span className="text-xs opacity-60 ml-0.5">%</span></p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center md:items-end">
                        <div className="flex items-center space-x-3 bg-amber-50/50 border border-amber-100 px-6 py-4 rounded-[2rem] animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Evaluation in Progress</span>
                        </div>
                        <p className="text-[8px] text-slate-300 font-bold mt-2 uppercase tracking-widest">Estimated Review: 2-4 Hours</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default App;
