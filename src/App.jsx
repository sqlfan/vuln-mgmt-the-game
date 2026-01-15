import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Zap, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  Server, 
  Terminal,
  Activity,
  Skull,
  Play,
  RotateCcw,
  Lock,
  Globe,
  Building,
  Bot,
  Users,
  Briefcase,
  Clock,
  Calendar,
  Heart,
  Hammer,
  Rocket,
  HelpCircle,
  X,
  LogOut,
  Trophy,
  Award,
  Minus,
  Square
} from 'lucide-react';

// --- Game Constants ---
const INITIAL_HEALTH = 100;
const INITIAL_CAPACITY = 12;
const AUTOMATION_COST = Math.floor(INITIAL_CAPACITY / 2);
const TRAINING_COST = 3;
const EXCEPTION_MAINTENANCE_COST = 1;
// const CVSS_GROWTH_ON_EXCEPTION = 0.8; // Removed per new mechanic
const DAMAGE_MULTIPLIER = 1.5;
const EXTERNAL_THREAT_MULTIPLIER = 1.5;
const SLA_BREACH_PENALTY_MULTIPLIER = 2.0; // Damage for overdue items
const SLA_BREACH_WORK_PENALTY = 20; // Damage for missing work items
const MAX_WORK_CAPACITY_RATIO = 0.8;
const BASE_EXPLOIT_CHANCE = 0.05; // 5% chance per open vulnerability
const EXCEPTION_EXPLOIT_CHANCE = 0.15; // 15% chance per excepted vulnerability
const PERFECT_SPRINT_BONUS = 5; // Healing for clean sprint
const FEATURE_BUILD_SCORE_MULTIPLIER = 25; // Points per capacity invested
const FEATURE_BUILD_RISK_FACTOR = 0.2; // Extra spawn chance per capacity invested

const SPRINT_DAYS = 14; // 1 Sprint = 2 weeks
const MAX_SPRINTS_STANDARD = 26; // ~365 Days

// Utility to calculate patch cost
const getPatchCost = (cvss, automationLevel = 0) => {
  const baseCost = Math.floor(cvss / 2.5);
  return Math.max(1, baseCost - automationLevel);
};

// Utility to get SLA days based on CVSS
const getSLA = (cvss) => {
  if (cvss >= 10.0) return 7;
  if (cvss >= 7.0) return 30;
  if (cvss >= 4.0) return 60;
  return 90;
};

// Utility to generate unique ID to prevent React key collisions
const generateUniqueId = (prefix) => {
  const randomPart = Math.floor(Math.random() * 100000);
  const timePart = Date.now().toString().slice(-4); 
  return `${prefix}-${randomPart}-${timePart}`;
};

// --- Audio Utility ---
const playSound = (type) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  
  if (type === 'victory') {
    // Fanfare: C5, E5, G5, C6 (Rising Arpeggio)
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = now + (i * 0.15);
      const duration = i === 3 ? 0.8 : 0.2;
      
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } else if (type === 'gameover') {
    // Sad Trombone: G4, F#4, F4, E4 (Descending with slide)
    const now = ctx.currentTime;
    
    // First 3 notes
    [392.00, 369.99, 349.23].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      const startTime = now + (i * 0.4);
      const duration = 0.3;
      
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    // Last note (Long slide down)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 329.63; // E4
    
    const startTime = now + 1.2;
    const duration = 1.5;
    
    // Slide pitch down
    osc.frequency.setValueAtTime(329.63, startTime);
    osc.frequency.linearRampToValueAtTime(270, startTime + duration);
    
    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
};

// --- Components ---

const ProgressBar = ({ value, max, colorClass, label, icon: Icon }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col w-full mb-2">
      <div className="flex justify-between items-center mb-1 text-xs uppercase tracking-wider font-bold text-gray-400">
        <span className="flex items-center gap-1">{Icon && <Icon size={14} />} {label}</span>
        <span>{Math.round(value)} / {max}</span>
      </div>
      <div className="h-3 w-full bg-gray-800 rounded-none overflow-hidden border border-gray-700">
        <div 
          className={`h-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const WorkCard = ({ item, capacity, onComplete }) => {
  const isAffordable = capacity >= item.cost;
  
  if (item.completed) {
    return (
      <div className="flex items-center justify-between p-4 rounded-none border border-blue-900/50 bg-blue-900/20 opacity-60">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-blue-400" size={20} />
          <span className="text-sm font-bold text-blue-300 line-through">{item.name}</span>
        </div>
        <span className="text-xs text-blue-400 font-mono">COMPLETED</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col p-4 rounded-none border border-blue-500/30 bg-gradient-to-br from-blue-900/10 to-gray-900 shadow-lg transition-all hover:scale-[1.01]">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <Briefcase size={64} />
      </div>
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Mandatory Objective</span>
          <h3 className="font-bold text-lg text-gray-100">{item.name}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 uppercase">Effort</span>
          <span className="text-2xl font-black text-white">{item.cost}</span>
        </div>
      </div>

      <p className="text-gray-400 text-xs mb-4 font-mono leading-relaxed relative z-10">
        Business Requirement. Must be completed this sprint to avoid SLA breach penalties.
      </p>

      <button
        onClick={() => onComplete(item.id)}
        disabled={!isAffordable}
        className={`
          mt-auto relative z-10 flex items-center justify-center p-2 rounded-none border transition-colors font-bold text-sm
          ${isAffordable 
            ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
            : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'}
        `}
      >
        {isAffordable ? 'EXECUTE WORK ITEM' : 'INSUFFICIENT CAPACITY'}
      </button>
    </div>
  );
};

const CveCard = ({ cve, capacity, automationLevel, onPatch, onToggleException }) => {
  const patchCost = getPatchCost(cve.cvss, automationLevel);
  const baseCost = Math.floor(cve.cvss / 2.5);
  const isDiscounted = patchCost < baseCost && patchCost > 1;

  const isCritical = cve.cvss >= 9.0;
  const isHigh = cve.cvss >= 7.0 && cve.cvss < 9.0;
  const isMedium = cve.cvss >= 4.0 && cve.cvss < 7.0;
  const isExternal = cve.context === 'External';
  
  // SLA Calculations
  const slaDays = getSLA(cve.cvss);
  const currentAgeDays = cve.age * SPRINT_DAYS;
  const nextCheckDays = (cve.age + 1) * SPRINT_DAYS;
  const isOverdueNextTurn = nextCheckDays > slaDays;
  const daysRemaining = Math.max(0, slaDays - currentAgeDays);
  
  // Patch logic
  const canPatch = cve.patchAvailable;
  
  let borderColor = "border-gray-600";
  let textColor = "text-gray-300";
  let bgGradient = "from-gray-800 to-gray-900";

  if (isCritical) {
    borderColor = "border-red-600";
    textColor = "text-red-500";
    bgGradient = "from-red-900/20 to-gray-900";
  } else if (isHigh) {
    borderColor = "border-orange-500";
    textColor = "text-orange-500";
    bgGradient = "from-orange-900/20 to-gray-900";
  } else if (isMedium) {
    borderColor = "border-yellow-500";
    textColor = "text-yellow-500";
  }

  return (
    <div className={`relative flex flex-col p-4 rounded-none border ${borderColor} bg-gradient-to-br ${bgGradient} shadow-lg transition-all hover:scale-[1.02]`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
             <span className={`text-xs font-mono opacity-70 ${textColor}`}>{cve.id}</span>
             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-none flex items-center gap-1 ${isExternal ? 'bg-purple-900/50 text-purple-300 border border-purple-700' : 'bg-blue-900/30 text-blue-300 border border-blue-800'}`}>
                {isExternal ? <Globe size={10} /> : <Building size={10} />}
                {cve.context}
             </span>
          </div>
          <h3 className={`font-bold text-lg flex items-center gap-2 ${textColor}`}>
            <Server size={16} />
            {cve.type}
          </h3>
        </div>
        <div className={`flex flex-col items-end`}>
          <span className="text-xs text-gray-400 uppercase">CVSS v3</span>
          <span className={`text-2xl font-black ${textColor}`}>{cve.cvss.toFixed(1)}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-xs mb-3 font-mono leading-relaxed">
        {cve.description}
      </p>

      {/* SLA / Status Indicators */}
      <div className="flex flex-col gap-1 mb-3">
        {cve.isExcepted ? (
          <div className="px-2 py-1 bg-yellow-900/30 border border-yellow-700/50 rounded-none flex items-center gap-2 text-yellow-500 text-xs animate-pulse">
            <FileText size={12} />
            <span>EXCEPTION ACTIVE (High Exploit Risk)</span>
          </div>
        ) : (
          <div className={`px-2 py-1 rounded-none flex items-center justify-between text-xs border ${isOverdueNextTurn ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
            <span className="flex items-center gap-2">
              <Calendar size={12} />
              {isOverdueNextTurn ? 'SLA WARNING' : 'Due Date'}
            </span>
            <span className={`font-bold ${isOverdueNextTurn ? 'text-red-400' : 'text-gray-300'}`}>
               {isOverdueNextTurn ? 'Breaches Next Sprint!' : `${daysRemaining} Days`}
            </span>
          </div>
        )}
        
        {/* Patch Availability Status */}
        {!canPatch && (
          <div className="px-2 py-1 bg-orange-900/20 border border-orange-800/50 rounded-none flex items-center justify-between text-xs text-orange-400">
             <span className="flex items-center gap-2"><Hammer size={12} /> Patch Development:</span>
             <span className="font-bold">ETA {cve.sprintsToPatch} Sprints</span>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        {/* Exception Button */}
        <button
          onClick={() => onToggleException(cve.id)}
          className={`
            flex flex-col items-center justify-center p-2 rounded-none border transition-colors
            ${cve.isExcepted 
              ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30' 
              : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white'}
          `}
        >
          <div className="flex items-center gap-1 text-sm font-bold">
            <FileText size={14} />
            {cve.isExcepted ? 'REVOKE' : 'DEFER'}
          </div>
          <span className="text-[10px] opacity-70">
            {cve.isExcepted ? 'Free up 1 Cap' : `Costs 1 Cap/Sprint`}
          </span>
        </button>

        {/* Patch Button */}
        <button
          onClick={() => onPatch(cve.id)}
          disabled={capacity < patchCost || !canPatch}
          className={`
            flex flex-col items-center justify-center p-2 rounded-none border transition-colors
            ${capacity >= patchCost && canPatch
              ? 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30 cursor-pointer' 
              : 'bg-gray-800/50 border-gray-700 text-gray-600 cursor-not-allowed'}
          `}
        >
          <div className="flex items-center gap-1 text-sm font-bold">
            <CheckCircle size={14} />
            {canPatch ? 'PATCH' : 'NO PATCH'}
          </div>
          <span className="text-[10px] opacity-70 flex items-center gap-1">
             {canPatch ? `Cost: ${patchCost} Cap` : 'AWAITING VENDOR'}
             {isDiscounted && canPatch && <span className="text-green-400 text-[9px]">(Saved)</span>}
          </span>
        </button>
      </div>
    </div>
  );
};

const HelpModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-none max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold text-white">Field Manual: Vuln Management</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <Minus size={18} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <Square size={16} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-red-900/20 p-1 border border-red-900">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed text-gray-300">
          
          <div className="space-y-6">
            <section>
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <Activity className="text-green-400" size={18} /> Core Objective
              </h3>
              <p>
                Maintain <strong>Business Health</strong> while maximizing <strong>Business Output</strong> (Score). 
                Each Sprint represents 2 weeks. You have limited <strong>Capacity</strong> to spend on actions.
              </p>
            </section>

            <section>
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <Briefcase className="text-blue-400" size={18} /> Mandatory Work
              </h3>
              <p>
                Blue cards represent business requirements. These <span className="text-red-400 font-bold">MUST</span> be completed 
                in the current Sprint. Failure results in a massive <strong>SLA Breach Penalty (-20 HP)</strong>.
              </p>
            </section>

            <section>
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <AlertTriangle className="text-red-400" size={18} /> Threat Management
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>SLA Timers:</strong> Vulnerabilities don't deal damage immediately. They only hurt you if they go <strong>Overdue</strong>.</li>
                <li><strong>Deadlines:</strong> Critical (7 days), High (30 days), Med (60 days), Low (90 days).</li>
                <li><strong>Zero-Day Attacks:</strong> Leaving vulnerabilities open increases the risk of a random Malicious Exploit event, which spawns an immediate critical threat.</li>
                <li><strong>Vendor Delays:</strong> Some threats have no patch available yet. You must wait/survive until the vendor releases it.</li>
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <Zap className="text-yellow-400" size={18} /> Strategic Actions
              </h3>
              <div className="grid gap-3">
                <div className="bg-gray-800/50 p-3 rounded-none border border-gray-700">
                  <span className="text-yellow-400 font-bold block mb-1">File Exception (Defer)</span>
                  Stops the SLA timer for a CVE. <br/>
                  <span className="text-xs opacity-70">Cost: Locks 1 Capacity/Sprint. <span className="text-orange-400">Risk: Increases Malicious Exploit probability significantly.</span></span>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-none border border-gray-700">
                  <span className="text-cyan-400 font-bold block mb-1">Automate</span>
                  Reduces the cost of patching all future vulnerabilities. <br/>
                  <span className="text-xs opacity-70">Takes effect: Next Sprint.</span>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-none border border-gray-700">
                  <span className="text-pink-400 font-bold block mb-1">Train Team</span>
                  Improves code quality, reducing the number of new CVEs appearing each Sprint.
                </div>
                <div className="bg-gray-800/50 p-3 rounded-none border border-gray-700">
                  <span className="text-purple-400 font-bold block mb-1">Build Features</span>
                  Converts ALL remaining Capacity into Business Output (Score). <br/>
                  <span className="text-xs opacity-70 text-red-400">Warning: Increases vulnerability spawn rate next Sprint.</span>
                </div>
              </div>
            </section>

             <section>
              <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                <Heart className="text-green-500" size={18} /> Bonuses
              </h3>
              <p>
                <strong>Perfect Sprint:</strong> If you end a turn with 0 active CVEs and all Work Items complete, 
                you restore <strong>+5 Business Health</strong>.
              </p>
            </section>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-800 bg-gray-900/50 text-center">
           <button 
             onClick={onClose}
             className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-none font-bold transition-all"
           >
             RETURN TO DASHBOARD
           </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState('start');
  const [gameMode, setGameMode] = useState(null); // 'standard' or 'endless'
  const [sprint, setSprint] = useState(1);
  const [health, setHealth] = useState(INITIAL_HEALTH);
  const [capacity, setCapacity] = useState(INITIAL_CAPACITY);
  const [automationLevel, setAutomationLevel] = useState(0);
  const [pendingAutomation, setPendingAutomation] = useState(0);
  const [trainingLevel, setTrainingLevel] = useState(0);
  const [pendingFeatureInvestment, setPendingFeatureInvestment] = useState(0);
  const [cves, setCves] = useState([]);
  const [workItems, setWorkItems] = useState([]); 
  const [logs, setLogs] = useState([]);
  const [score, setScore] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  
  // Use a ref for the SCROLLABLE CONTAINER, not a dummy element
  const logsContainerRef = useRef(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // --- Game Logic ---

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), msg, type }]);
  };

  const generateWorkItems = (sprintNum) => {
    const tasks = [
      'Quarterly Compliance Audit', 'Client Feature Release', 'Legacy Migration', 
      'Server Upgrade', 'API Documentation', 'Security Training', 
      'Stakeholder Demo', 'Data Backup Verify', 'Performance Tuning'
    ];
    
    // Max capacity for work is 80% of initial
    const maxWorkCost = Math.floor(INITIAL_CAPACITY * MAX_WORK_CAPACITY_RATIO);
    let currentCost = 0;
    const items = [];

    // 1-3 items per sprint
    const itemCount = Math.floor(Math.random() * 2) + 1; 

    for (let i = 0; i < itemCount; i++) {
      const budget = maxWorkCost - currentCost;
      if (budget <= 1) break;
      const cost = Math.min(budget, Math.floor(Math.random() * 4) + 2);
      currentCost += cost;
      
      const name = tasks[Math.floor(Math.random() * tasks.length)];
      items.push({
        id: generateUniqueId('WORK'),
        name: name,
        cost: cost,
        completed: false
      });
    }
    return items;
  };

  const generateCVE = (sprintNum) => {
    const types = ['SQL Injection', 'XSS', 'Buffer Overflow', 'RCE', 'Auth Bypass', 'Privilege Escalation', 'Deserialization', 'Memory Leak'];
    const targets = ['Web App', 'DB Server', 'Auth Service', 'Payment Gateway', 'Legacy API', 'Admin Panel'];
    const context = Math.random() > 0.5 ? 'External' : 'Internal';

    const baseMin = Math.min(8, 1 + (sprintNum * 0.3));
    const baseMax = 10;
    let cvss = (Math.random() * (baseMax - baseMin) + baseMin);
    if (Math.random() > 0.8) cvss = Math.random() * 4 + 1;
    cvss = Math.round(cvss * 10) / 10;
    if (cvss > 10) cvss = 10.0;

    const type = types[Math.floor(Math.random() * types.length)];
    const target = targets[Math.floor(Math.random() * targets.length)];

    // Patch Availability Logic
    const hasPatchAvailable = Math.random() > 0.3; // 30% chance of NO patch initially
    let sprintsToPatch = 0;
    
    if (!hasPatchAvailable) {
      if (cvss >= 9.0) {
        sprintsToPatch = 1; // Priority fix for critical
      } else if (cvss >= 7.0) {
        sprintsToPatch = Math.floor(Math.random() * 2) + 1; // 1-2 sprints
      } else {
        sprintsToPatch = Math.floor(Math.random() * 2) + 2; // 2-3 sprints
      }
    }

    return {
      id: generateUniqueId('CVE-2025'),
      name: type,
      description: `${type} vulnerability detected in ${context} ${target}.`,
      type: target,
      context: context,
      cvss: cvss,
      isExcepted: false,
      sprintsExcepted: 0,
      age: 0,
      patchAvailable: hasPatchAvailable,
      sprintsToPatch: sprintsToPatch
    };
  };

  const startGame = (mode) => {
    setGameState('playing');
    setGameMode(mode);
    setSprint(1);
    setHealth(INITIAL_HEALTH);
    setCapacity(INITIAL_CAPACITY);
    setAutomationLevel(0);
    setPendingAutomation(0);
    setTrainingLevel(0);
    setPendingFeatureInvestment(0);
    setScore(0);
    setLogs([]);
    addLog(`System initialized in ${mode === 'standard' ? 'STANDARD' : 'ENDLESS'} mode. Monitoring for vulnerabilities...`, "success");
    
    // Ensure initial spawn has patches so user isn't stuck turn 1
    const c1 = generateCVE(1); c1.patchAvailable = true; c1.sprintsToPatch = 0;
    const c2 = generateCVE(1); c2.patchAvailable = true; c2.sprintsToPatch = 0;
    setCves([c1, c2]);
    setWorkItems(generateWorkItems(1));
  };

  const handlePatch = (id) => {
    const cve = cves.find(c => c.id === id);
    const cost = getPatchCost(cve.cvss, automationLevel);

    if (capacity >= cost && cve.patchAvailable) {
      setCapacity(prev => prev - cost);
      setCves(prev => prev.filter(c => c.id !== id));
      setScore(prev => prev + Math.floor(cve.cvss * 10));
      addLog(`Patched ${cve.id} (Cost: ${cost}). Integrity secure.`, "success");
    }
  };

  const handleCompleteWork = (id) => {
    const item = workItems.find(i => i.id === id);
    if (capacity >= item.cost) {
      setCapacity(prev => prev - item.cost);
      setWorkItems(prev => prev.map(i => i.id === id ? { ...i, completed: true } : i));
      setScore(prev => prev + (item.cost * 5));
      addLog(`Completed Objective: ${item.name}.`, "success");
    }
  };

  const handleToggleException = (id) => {
    setCves(prev => prev.map(cve => {
      if (cve.id === id) {
        const newStatus = !cve.isExcepted;
        addLog(
          newStatus 
            ? `Exception filed for ${cve.id}. Risk accepted temporarily.` 
            : `Exception revoked for ${cve.id}. Remediation required.`,
          newStatus ? "warning" : "info"
        );
        return { ...cve, isExcepted: newStatus };
      }
      return cve;
    }));
  };

  const handleInvest = () => {
    if (capacity >= AUTOMATION_COST) {
      setCapacity(prev => prev - AUTOMATION_COST);
      setPendingAutomation(prev => prev + 1);
      addLog(`Investment confirmed. Automation Level will upgrade next Sprint.`, "success");
    }
  };

  const handleTrain = () => {
    if (capacity >= TRAINING_COST) {
      setCapacity(prev => prev - TRAINING_COST);
      setTrainingLevel(prev => prev + 1);
      addLog(`Team Training Completed (Level ${trainingLevel + 1}). Code quality improved.`, "success");
    }
  };

  const handleBuildFeatures = () => {
    if (capacity > 0) {
      const invested = capacity;
      setPendingFeatureInvestment(invested);
      setCapacity(0);
      addLog(`Allocated ${invested} Capacity to Feature Build. Results next Sprint.`, "success");
    }
  };

  const handleResign = () => {
    setGameState('gameover');
    addLog("Manual resignation. Game Over.", "error");
    playSound('gameover'); // Play sad sound on resignation
  };

  const endTurn = () => {
    let damage = 0;
    let healing = 0;
    let reservedCapacity = 0;
    let newCves = [...cves];
    let exploitEventOccurred = false;

    // 0. Apply Feature Build Results
    if (pendingFeatureInvestment > 0) {
      const bonus = pendingFeatureInvestment * FEATURE_BUILD_SCORE_MULTIPLIER;
      setScore(prev => prev + bonus);
      addLog(`Feature deployment successful! Business Output +${bonus}.`, "success");
    }

    // 1. Process Work Items (Penalties)
    const uncompletedWork = workItems.filter(i => !i.completed);
    if (uncompletedWork.length > 0) {
      const slaDamage = uncompletedWork.length * SLA_BREACH_WORK_PENALTY;
      damage += slaDamage;
      addLog(`WORK ITEM MISSED! -${slaDamage} Integrity.`, "error");
    } else {
      addLog("All business objectives met.", "success");
    }

    // 2. Process CVEs (SLA Checks & Updates)
    const activeCvesForExploit = [];
    let numExceptedActive = 0;
    
    newCves = newCves.map(cve => {
      let currentCvss = cve.cvss;
      let updatedCve = { ...cve };
      
      // Update Patch Availability
      if (!updatedCve.patchAvailable) {
        updatedCve.sprintsToPatch -= 1;
        if (updatedCve.sprintsToPatch <= 0) {
          updatedCve.patchAvailable = true;
          updatedCve.sprintsToPatch = 0;
          addLog(`Patch released for ${cve.id}! Vendor update available.`, "success");
        }
      }
      
      // Calculate SLA status
      const slaDays = getSLA(currentCvss);
      const daysElapsedAfterThisRound = (cve.age + 1) * SPRINT_DAYS;
      const isBreached = daysElapsedAfterThisRound > slaDays;

      if (cve.isExcepted) {
        reservedCapacity += EXCEPTION_MAINTENANCE_COST;
        
        numExceptedActive++;
        // No CVSS Growth now
        
        updatedCve = { 
          ...updatedCve, 
          cvss: currentCvss, 
          sprintsExcepted: cve.sprintsExcepted + 1,
          age: cve.age + 1,
          description: `Deferred ${cve.sprintsExcepted + 1} sprints. Exploit risk critical.`
        };
        activeCvesForExploit.push(updatedCve);
        return updatedCve;
      } else {
        const contextMultiplier = cve.context === 'External' ? EXTERNAL_THREAT_MULTIPLIER : 1.0;
        
        // NEW LOGIC: Damage ONLY if breached
        if (isBreached) {
           const breachDamage = currentCvss * DAMAGE_MULTIPLIER * contextMultiplier * SLA_BREACH_PENALTY_MULTIPLIER;
           damage += breachDamage;
           addLog(`SLA BREACH on ${cve.id}! Compliance penalty active (-${Math.floor(breachDamage)}).`, "error");
        }
        
        updatedCve = { ...updatedCve, age: cve.age + 1 };
        activeCvesForExploit.push(updatedCve);
        return updatedCve;
      }
    });

    // 3. Special Event: Malicious Actor Exploit
    if (activeCvesForExploit.length > 0) {
      const numStandardActive = activeCvesForExploit.length - numExceptedActive;
      
      // Combined probability: 1 - (ProbSafe_Standard * ProbSafe_Exception)
      const pSafeStandard = Math.pow((1 - BASE_EXPLOIT_CHANCE), numStandardActive);
      const pSafeException = Math.pow((1 - EXCEPTION_EXPLOIT_CHANCE), numExceptedActive);
      
      const combinedRiskChance = 1 - (pSafeStandard * pSafeException);
      
      if (Math.random() < combinedRiskChance) {
        exploitEventOccurred = true;
        
        // Create the Zero-Day CVE
        const zeroDayId = generateUniqueId('0DAY');
        const zeroDayCve = {
          id: zeroDayId,
          name: "Zero-Day RCE",
          description: "Critical remote code execution vulnerability exposed during active attack.",
          type: "Infrastructure",
          context: "External",
          cvss: 10.0,
          isExcepted: false,
          sprintsExcepted: 0,
          age: 0,
          patchAvailable: false, // ZERO DAY: No patch immediately available
          sprintsToPatch: 1 // Available next turn (priority)
        };
        
        // Calculate Damage (High impact)
        const contextMultiplier = EXTERNAL_THREAT_MULTIPLIER;
        const exploitDamage = zeroDayCve.cvss * DAMAGE_MULTIPLIER * contextMultiplier * 2.0; 
        damage += exploitDamage;
        
        addLog(`MALICIOUS ZERO-DAY ATTACK! (-${Math.floor(exploitDamage)} Integrity). Patch pending next sprint.`, "error");
        
        // Add to the list to be addressed next sprint
        newCves.push(zeroDayCve);
      }
    }

    // 4. Perfect Sprint Check (Bonus Healing)
    // Check original cves list length (must be empty implies all patched/none left)
    // AND uncompletedWork length must be 0
    if (cves.length === 0 && uncompletedWork.length === 0) {
      healing = PERFECT_SPRINT_BONUS;
      addLog(`PERFECT SPRINT! Operations optimal. Integrity restored (+${healing}).`, "success");
    }

    // 5. Apply Damage & Healing
    const damageTaken = Math.floor(damage);
    const newHealth = Math.min(INITIAL_HEALTH, Math.max(0, health - damageTaken + healing));
    setHealth(newHealth);

    if (damageTaken > 0 && uncompletedWork.length === 0 && !exploitEventOccurred) {
       addLog(`Compliance penalties applied: -${damageTaken} Integrity.`, "error");
    }

    if (newHealth <= 0) {
      playSound('gameover'); // Play sad sound on loss
      setGameState('gameover');
      return;
    }

    // CHECK VICTORY CONDITION (Standard Mode)
    if (gameMode === 'standard' && sprint >= MAX_SPRINTS_STANDARD) {
      playSound('victory'); // Play fanfare on victory
      setGameState('victory');
      return;
    }

    // 6. Next Sprint Setup
    const nextSprint = sprint + 1;
    setSprint(nextSprint);

    // Apply Pending Automation Upgrades
    if (pendingAutomation > 0) {
      setAutomationLevel(prev => prev + pendingAutomation);
      setPendingAutomation(0);
      addLog(`Automation upgrades online. Patch costs reduced for Sprint ${nextSprint}.`, "success");
    }
    
    const effectiveCapacity = Math.max(0, INITIAL_CAPACITY - reservedCapacity);
    setCapacity(effectiveCapacity);
    
    if (reservedCapacity > 0) {
      addLog(`${reservedCapacity} Capacity reserved for active exceptions.`, "warning");
    }

    // 7. Spawn new items
    const baseSpawn = 2 + (sprint * 0.2) + (Math.random() * 1.5);
    const trainingReduction = trainingLevel * 0.5;
    
    // Increased risk from feature build
    const featureRisk = pendingFeatureInvestment * FEATURE_BUILD_RISK_FACTOR; 
    if (featureRisk > 0) {
       addLog(`Rapid feature development increased vulnerability risk by ${(featureRisk * 100).toFixed(0)}% chance.`, "warning");
    }
    
    let spawnCount = Math.max(1, Math.floor(baseSpawn - trainingReduction + featureRisk));
    // Reset pending investment
    setPendingFeatureInvestment(0);

    for (let i = 0; i < spawnCount; i++) {
      newCves.push(generateCVE(nextSprint));
    }
    
    newCves.sort((a, b) => b.cvss - a.cvss);
    setCves(newCves);
    
    setWorkItems(generateWorkItems(nextSprint));
  };

  // --- Render Helpers ---

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-blue-300';
    }
  };

  const calculateReserved = () => {
    return cves.filter(c => c.isExcepted).length * EXCEPTION_MAINTENANCE_COST;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-green-900 selection:text-white">
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50 shadow-xl">
        {gameState === 'playing' ? (
          // PLAYING LAYOUT (3 Rows)
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            
            {/* Row 1: Title */}
            <div className="flex justify-center items-center pb-2 border-b border-gray-800">
               <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-none border border-blue-800">
                  <Shield className="text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-white">Vuln Management</h1>
                    <button 
                      onClick={() => setShowHelp(true)}
                      className="p-1 text-gray-500 hover:text-white transition-colors"
                      title="Field Manual"
                    >
                      <HelpCircle size={18} />
                    </button>
                  </div>
                  <div className="text-xs text-blue-400 font-mono">SECURE THE BUSINESS</div>
                </div>
              </div>
            </div>

            {/* Row 2: Stats */}
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 px-4 bg-gray-800/30 p-2 rounded-none border border-gray-800">
               <div className="col-span-1">
                 <div className="text-xs text-gray-500 uppercase font-bold">Sprint</div>
                 <div className="text-2xl font-mono">{sprint}</div>
                 <div className="text-[10px] text-gray-600">Day {sprint * 14}</div>
              </div>
              <div className="col-span-1">
                 <div className="text-xs text-gray-500 uppercase font-bold">Business Output</div>
                 <div className="text-2xl font-mono text-purple-400">{score}</div>
              </div>
              <div className="col-span-2 md:col-span-2">
                 <ProgressBar 
                    value={health} 
                    max={INITIAL_HEALTH} 
                    colorClass={health < 30 ? 'bg-red-500' : 'bg-green-500'} 
                    label="Business Health"
                    icon={Activity}
                 />
                 <div className="flex justify-between text-xs mt-1">
                   <span className="flex items-center gap-1 text-yellow-400">
                     <Zap size={10} />
                     Cap: {capacity}
                   </span>
                   <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Bot size={10} />
                      Auto: {automationLevel} {pendingAutomation > 0 && <span className="text-cyan-200 animate-pulse">(+{pendingAutomation})</span>}
                    </span>
                    <span className="flex items-center gap-1 text-pink-400">
                      <Users size={10} />
                      Train: {trainingLevel}
                    </span>
                   </div>
                 </div>
              </div>
            </div>

            {/* Row 3: Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={handleBuildFeatures}
                  disabled={capacity === 0}
                  className={`
                    px-3 py-2 rounded-none font-bold shadow-lg transition-all flex items-center gap-2 border text-sm
                    ${capacity > 0 
                      ? 'bg-purple-900/40 border-purple-500 text-purple-300 hover:bg-purple-900/60' 
                      : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'}
                  `}
                  title={`Invest ${capacity} Capacity. Get ${capacity * FEATURE_BUILD_SCORE_MULTIPLIER} points.`}
                 >
                   <Rocket size={16} />
                   <span className="hidden sm:inline">Build Features <span className="opacity-70 text-xs">(All)</span></span>
                 </button>

                <button 
                  onClick={handleTrain}
                  disabled={capacity < TRAINING_COST}
                  className={`
                    px-3 py-2 rounded-none font-bold shadow-lg transition-all flex items-center gap-2 border text-sm
                    ${capacity >= TRAINING_COST 
                      ? 'bg-pink-900/40 border-pink-500 text-pink-300 hover:bg-pink-900/60' 
                      : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'}
                  `}
                  title={`Cost: ${TRAINING_COST} Capacity`}
                 >
                   <Users size={16} />
                   <span className="hidden sm:inline">Train <span className="opacity-70 text-xs">(-{TRAINING_COST})</span></span>
                 </button>

                 <button 
                  onClick={handleInvest}
                  disabled={capacity < AUTOMATION_COST}
                  className={`
                    px-3 py-2 rounded-none font-bold shadow-lg transition-all flex items-center gap-2 border text-sm
                    ${capacity >= AUTOMATION_COST 
                      ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 hover:bg-cyan-900/60' 
                      : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'}
                  `}
                  title={`Cost: ${AUTOMATION_COST} Capacity`}
                 >
                   <Bot size={16} />
                   <span className="hidden sm:inline">Auto <span className="opacity-70 text-xs">(-{AUTOMATION_COST})</span></span>
                 </button>
                 
                 <button 
                  onClick={endTurn}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-none font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 text-sm"
                 >
                   <Play size={16} fill="currentColor" />
                   Next
                 </button>

                 <button 
                  onClick={handleResign}
                  className="px-3 py-2 rounded-none font-bold shadow-lg transition-all flex items-center gap-2 border text-sm bg-red-900/20 border-red-800 text-red-500 hover:bg-red-900/40"
                  title="Resign Game"
                 >
                   <LogOut size={16} />
                   <span className="hidden sm:inline">Resign</span>
                 </button>
            </div>

          </div>
        ) : (
          // NON-PLAYING LAYOUT (Original)
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-900/30 rounded-none border border-blue-800">
                <Shield className="text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">Vuln Management</h1>
                  <button 
                    onClick={() => setShowHelp(true)}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                    title="Field Manual"
                  >
                    <HelpCircle size={18} />
                  </button>
                </div>
                <div className="text-xs text-blue-400 font-mono">SECURE THE BUSINESS</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Game Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {gameState === 'start' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 bg-gray-900/50 rounded-none border border-gray-800 p-8">
              <Shield size={64} className="text-blue-500 animate-pulse" />
              <h2 className="text-4xl font-bold">Ready to Defend?</h2>
              <p className="max-w-md text-gray-400">
                Balance business objectives with security risks.
                <br/><br/>
                1. Complete <strong>Mandatory Work</strong> to avoid penalties.<br/>
                2. Patch <strong>CVEs</strong> within their Due Date (SLA).<br/>
                3. Some threats may require a <strong>Vendor Patch</strong> wait.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => startGame('standard')}
                  className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-none font-bold shadow-lg transition-transform hover:scale-105"
                >
                  <Calendar size={24} className="mb-2" />
                  <span>STANDARD OPERATION</span>
                  <span className="text-xs font-normal opacity-80 mt-1">Survive 365 Days (26 Sprints)</span>
                </button>
                
                <button 
                  onClick={() => startGame('endless')}
                  className="flex flex-col items-center justify-center bg-purple-700 hover:bg-purple-600 text-white px-8 py-4 rounded-none font-bold shadow-lg transition-transform hover:scale-105"
                >
                  <RotateCcw size={24} className="mb-2" />
                  <span>ENDLESS DEFENSE</span>
                  <span className="text-xs font-normal opacity-80 mt-1">Play until compromised</span>
                </button>
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 bg-red-950/30 rounded-none border border-red-900/50 p-8">
              <Skull size={64} className="text-red-500" />
              <h2 className="text-4xl font-bold text-red-100">SYSTEM COMPROMISED</h2>
              <div className="bg-black/40 p-6 rounded-none border border-red-900/30 min-w-[300px]">
                <div className="text-sm text-red-400 uppercase tracking-widest mb-2">Final Business Output</div>
                <div className="text-5xl font-mono text-white mb-4">{score}</div>
                <div className="text-sm text-gray-400">Sprints Survived: {sprint}</div>
              </div>
              <button 
                onClick={() => setGameState('start')}
                className="bg-gray-700 hover:bg-gray-600 text-white text-lg px-8 py-3 rounded-none font-bold flex items-center gap-2"
              >
                <RotateCcw size={20} />
                MAIN MENU
              </button>
            </div>
          )}

          {gameState === 'victory' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 bg-green-950/30 rounded-none border border-green-900/50 p-8">
              <Trophy size={64} className="text-yellow-400" />
              <h2 className="text-4xl font-bold text-green-100">MISSION ACCOMPLISHED</h2>
              <p className="max-w-md text-gray-300">
                You successfully defended the infrastructure for a full year of operations.
              </p>
              <div className="bg-black/40 p-6 rounded-none border border-green-900/30 min-w-[300px]">
                <div className="flex items-center justify-center gap-2 mb-2 text-yellow-400">
                   <Award size={20} />
                   <div className="text-sm uppercase tracking-widest font-bold">Total Business Output</div>
                </div>
                <div className="text-6xl font-black text-white mb-4 tracking-tighter">{score}</div>
                <div className="text-sm text-gray-400">Sprints Completed: {sprint}</div>
              </div>
              <button 
                onClick={() => setGameState('start')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-lg px-8 py-3 rounded-none font-bold flex items-center gap-2"
              >
                <RotateCcw size={20} />
                MAIN MENU
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <>
              {/* Business Objectives Section */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={16} /> Business Objectives (Mandatory)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workItems.length === 0 ? (
                    <div className="col-span-full p-4 border border-blue-900/30 bg-blue-900/10 rounded-none text-center text-blue-400/50 text-sm">
                      No pending objectives.
                    </div>
                  ) : (
                    workItems.map(item => (
                      <WorkCard 
                        key={item.id}
                        item={item}
                        capacity={capacity}
                        onComplete={handleCompleteWork}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Security Threats Section */}
              <div className="flex flex-col gap-2">
                 <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={16} /> Security Threats
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cves.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 text-gray-600 border-2 border-dashed border-gray-800 rounded-none">
                      <CheckCircle size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">All Vulnerabilities Remediated</p>
                    </div>
                  ) : (
                    cves.map(cve => (
                      <CveCard 
                        key={cve.id} 
                        cve={cve} 
                        capacity={capacity}
                        automationLevel={automationLevel}
                        onPatch={handlePatch}
                        onToggleException={handleToggleException}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar / Logs */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-8rem)] sticky top-24">
          {/* Legend / Info */}
          <div className="bg-gray-900 p-4 rounded-none border border-gray-800 shadow-lg overflow-y-auto max-h-[50vh]">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
               <Terminal size={14} /> Protocol Guide
             </h3>
             <ul className="space-y-2 text-xs text-gray-400">
               <li className="flex justify-between items-center bg-blue-900/20 p-1 rounded-none border border-blue-900/50">
                 <span className="flex items-center gap-1 text-blue-300 font-bold"><Clock size={10} /> Time Scale:</span>
                 <span className="text-white">1 Sprint = 14 Days</span>
               </li>
               <li className="flex justify-between px-1 border-t border-gray-800 pt-1 mt-1">
                 <span>Standard Damage:</span>
                 <span className="text-green-400 font-bold">None (Safe)</span>
               </li>
               <li className="flex justify-between px-1">
                 <span className="text-red-400 font-bold">SLA Breach:</span>
                 <span className="text-red-400 font-bold">Penalty Damage</span>
               </li>
               <li className="flex justify-between px-1 pt-1 border-t border-gray-800 mt-1">
                 <span className="flex items-center gap-1 text-orange-400 font-bold"><Skull size={10} /> Exploit Risk:</span>
                 <span className="text-orange-400 font-bold">Low (Random)</span>
               </li>
               <li className="flex justify-between px-1">
                 <span className="flex items-center gap-1 text-yellow-400 font-bold"><FileText size={10} /> Excepted Risk:</span>
                 <span className="text-yellow-400 font-bold">+15% / Item</span>
               </li>
               <li className="border-t border-gray-800 my-1"></li>
               <li className="flex justify-between px-1">
                 <span className="flex items-center gap-1 text-green-400"><Heart size={10} /> Perfect Sprint:</span>
                 <span className="text-green-400 font-bold">+5 HP</span>
               </li>
               <li className="border-t border-gray-800 my-1"></li>
               <li className="flex justify-between px-1">
                 <span className="flex items-center gap-1 text-orange-400"><Hammer size={10} /> Zero-Day:</span>
                 <span className="text-orange-400">Wait for Vendor</span>
               </li>
               <li className="flex justify-between px-1">
                 <span>Critical (10.0):</span>
                 <span className="text-white">1 Round Wait</span>
               </li>
               <li className="flex justify-between px-1">
                 <span>High (7.0-9.9):</span>
                 <span className="text-gray-400">1-2 Round Wait</span>
               </li>
             </ul>
          </div>

          {/* Log Console */}
          <div className="flex-1 bg-black rounded-none border border-gray-800 shadow-inner overflow-hidden flex flex-col font-mono text-sm min-h-[200px]">
            <div className="bg-gray-900 p-2 border-b border-gray-800 flex justify-between items-center">
              <span className="text-xs text-gray-500">SYSTEM LOGS</span>
              <div className="flex gap-3 px-1">
                <Minus size={14} className="text-gray-500 hover:text-white cursor-pointer" />
                <Square size={12} className="text-gray-500 hover:text-white cursor-pointer" />
                <X size={14} className="text-gray-500 hover:text-red-500 cursor-pointer" />
              </div>
            </div>
            <div 
              ref={logsContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-800"
            >
              {logs.length === 0 && <span className="text-gray-600 italic">No activity recorded...</span>}
              {logs.map((log) => (
                <div key={log.id} className={`${getLogColor(log.type)}`}>
                  <span className="opacity-50 mr-2 text-[10px]">{new Date(log.id).toLocaleTimeString().split(' ')[0]}</span>
                  {log.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
