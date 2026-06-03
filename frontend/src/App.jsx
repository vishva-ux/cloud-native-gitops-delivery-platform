import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Layers, 
  GitBranch, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  Terminal, 
  TrendingUp, 
  Server, 
  Cpu, 
  Sliders, 
  CheckCircle,
  FileText,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// API Server configuration (relative path for in-cluster or absolute for local testing)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('cluster');
  const [selectedNamespace, setSelectedNamespace] = useState('dev');
  const [clusterInfo, setClusterInfo] = useState({ connected: false, mode: 'Connecting...', namespaces: [] });
  
  // Resource States
  const [deployments, setDeployments] = useState([]);
  const [pods, setPods] = useState([]);
  const [services, setServices] = useState([]);
  const [hpas, setHpas] = useState([]);
  
  // GitOps & Rollouts States
  const [gitopsStatus, setGitopsStatus] = useState({
    sync_status: 'Synced',
    drift_detected: false,
    last_sync_time: '',
    git_commit: '',
    git_commit_msg: '',
    cluster_commit: ''
  });
  const [rollouts, setRollouts] = useState([]);
  
  // Logs & Logging State
  const [selectedPod, setSelectedPod] = useState('');
  const [podLogs, setPodLogs] = useState('Select a pod to view logs...');
  const [terminalAutoScroll, setTerminalAutoScroll] = useState(true);
  
  // System State Indicators
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDrifting, setIsDrifting] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  
  // Observability Mock Stats (Graph data updated dynamically)
  const [metricsData, setMetricsData] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([
    { id: 1, name: "HostHighCpuUsage", severity: "warning", namespace: "prod", message: "CPU utilization on node-1 exceeds 85%", age: "12m" },
    { id: 2, name: "KubePodCrashLooping", severity: "critical", namespace: "staging", message: "Pod backend-staging-xxx restarts frequently", age: "4m" }
  ]);

  // Fetch initial cluster configuration details
  useEffect(() => {
    fetch(`${API_URL}/api/cluster/status`)
      .then(res => res.json())
      .then(data => setClusterInfo(data))
      .catch(err => console.error("Error loading cluster status:", err));

    // Seed Prometheus metrics chart data
    const now = new Date();
    const data = [];
    for (let i = 15; i >= 0; i--) {
      const timeStr = new Date(now.getTime() - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      data.push({
        time: timeStr,
        requests: Math.floor(Math.random() * 40) + 10,
        latency: Math.floor(Math.random() * 120) + 30,
        cpu: Math.floor(Math.random() * 20) + 60
      });
    }
    setMetricsData(data);
  }, []);

  // Poll resources and rollouts based on namespace and active updates
  useEffect(() => {
    let active = true;
    
    const fetchResources = () => {
      // Get Deployments, Pods, Services, HPAs
      fetch(`${API_URL}/api/cluster/resources?namespace=${selectedNamespace}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          setDeployments(data.deployments || []);
          setPods(data.pods || []);
          setServices(data.services || []);
          setHpas(data.hpas || []);
          
          // Auto-select first pod for log parsing if none is selected
          if (data.pods && data.pods.length > 0 && !selectedPod) {
            setSelectedPod(data.pods[0].name);
          }
        })
        .catch(err => console.error("Error fetching cluster resources:", err));

      // Get GitOps Sync and Drift data
      fetch(`${API_URL}/api/gitops/status`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          setGitopsStatus(data);
        })
        .catch(err => console.error("Error loading GitOps status:", err));

      // Get Progressive Delivery rollouts
      fetch(`${API_URL}/api/rollouts?namespace=${selectedNamespace}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          setRollouts(data || []);
        })
        .catch(err => console.error("Error loading rollouts:", err));
    };

    fetchResources();
    const interval = setInterval(fetchResources, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedNamespace, selectedPod]);

  // Handle Fetching Container Logs
  useEffect(() => {
    if (!selectedPod) return;
    
    fetch(`${API_URL}/api/cluster/logs?namespace=${selectedNamespace}&pod=${selectedPod}`)
      .then(res => res.json())
      .then(data => {
        setPodLogs(data.logs || 'No logs returned.');
      })
      .catch(err => setPodLogs(`Failed to stream logs: ${err}`));
  }, [selectedPod, selectedNamespace]);

  // Trigger simulated drift in backend
  const handleSimulateDrift = () => {
    setIsDrifting(true);
    fetch(`${API_URL}/api/gitops/drift`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setActionMessage(data.message);
        setTimeout(() => setIsDrifting(false), 2000);
      })
      .catch(err => {
        console.error(err);
        setIsDrifting(false);
      });
  };

  // Reconcile GitOps / Self-Heal manually
  const handleReconcileSync = () => {
    setIsSyncing(true);
    fetch(`${API_URL}/api/gitops/sync`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setActionMessage(data.message);
        setTimeout(() => setIsSyncing(false), 3000);
      })
      .catch(err => {
        console.error(err);
        setIsSyncing(false);
      });
  };

  // Progressive Rollouts actions (Promote / Abort)
  const handleRolloutAction = (action, rolloutName) => {
    setIsActionRunning(true);
    const endpoint = action === 'promote' ? 'promote' : 'abort';
    fetch(`${API_URL}/api/rollouts/${endpoint}?namespace=${selectedNamespace}&name=${rolloutName}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setActionMessage(data.message);
        setTimeout(() => setIsActionRunning(false), 2000);
      })
      .catch(err => {
        console.error(err);
        setIsActionRunning(false);
      });
  };

  // Update chart data points slowly to simulate real-time metrics scraper
  useEffect(() => {
    const chartInterval = setInterval(() => {
      setMetricsData(prev => {
        const next = [...prev.slice(1)];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        next.push({
          time: timeStr,
          requests: Math.floor(Math.random() * 40) + 10,
          latency: Math.floor(Math.random() * 120) + 30,
          cpu: Math.floor(Math.random() * 20) + 60
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(chartInterval);
  }, []);

  return (
    <div className="dashboard-wrapper">
      {/* Header Panel */}
      <header>
        <div className="brand-section">
          <div className="brand-icon">GO</div>
          <div>
            <h1 className="brand-title">GitOps Delivery Platform</h1>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className={`pulse-indicator ${clusterInfo.connected ? 'green' : 'orange'}`} style={{ width: 6, height: 6 }}></span>
              {clusterInfo.mode}
            </span>
          </div>
        </div>

        {/* Global Cluster Operations Dashboard Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'hsl(var(--bg-surface))', padding: '0.25rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))' }}>
            {['dev', 'staging', 'prod'].map(ns => (
              <button 
                key={ns} 
                className={`tab-btn ${selectedNamespace === ns ? 'active' : ''}`}
                onClick={() => { setSelectedNamespace(ns); setSelectedPod(''); }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {ns.toUpperCase()}
              </button>
            ))}
          </div>

          <button 
            className="btn-secondary" 
            onClick={handleSimulateDrift} 
            disabled={isDrifting}
            style={{ borderColor: 'hsl(var(--warning) / 0.4)', color: 'hsl(var(--warning))' }}
          >
            <AlertTriangle size={14} />
            Simulate Drift
          </button>

          <button 
            className="btn-primary" 
            onClick={handleReconcileSync} 
            disabled={isSyncing}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Healing State...' : 'Reconcile Sync'}
          </button>
        </div>
      </header>

      {/* Action status message alert overlay */}
      {actionMessage && (
        <div style={{
          background: 'hsla(var(--bg-surface) / 0.85)',
          border: '1px solid hsl(var(--primary))',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} style={{ color: 'hsl(var(--success))' }} />
            {actionMessage}
          </span>
          <button style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }} onClick={() => setActionMessage('')}>x</button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div className="tabs-navigation">
          <button className={`tab-btn ${activeTab === 'cluster' ? 'active' : ''}`} onClick={() => setActiveTab('cluster')}>
            <Server size={16} /> Cluster Topology
          </button>
          <button className={`tab-btn ${activeTab === 'gitops' ? 'active' : ''}`} onClick={() => setActiveTab('gitops')}>
            <GitBranch size={16} /> GitOps Reconciler
          </button>
          <button className={`tab-btn ${activeTab === 'rollouts' ? 'active' : ''}`} onClick={() => setActiveTab('rollouts')}>
            <Sliders size={16} /> Rollouts (Canary)
          </button>
          <button className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
            <Activity size={16} /> Metrics & Monitoring
          </button>
          <button className={`tab-btn ${activeTab === 'environments' ? 'active' : ''}`} onClick={() => setActiveTab('environments')}>
            <Layers size={16} /> Environments
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'cluster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* High Level Stats Grid */}
          <div className="grid-cols-4">
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span>Deployments</span>
                <Server size={16} />
              </div>
              <div className="stat-value">{deployments.length}</div>
              <div className="stat-footer">
                <span className="status-badge healthy">Active</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>In Namespace</span>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span>Pods Running</span>
                <Layers size={16} />
              </div>
              <div className="stat-value">{pods.filter(p => p.status === 'Running').length} / {pods.length}</div>
              <div className="stat-footer">
                <span style={{ color: 'hsl(var(--text-muted))' }}>
                  {pods.reduce((acc, curr) => acc + curr.restarts, 0)} Restarts detected
                </span>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span>Ingress Services</span>
                <Cpu size={16} />
              </div>
              <div className="stat-value">{services.length}</div>
              <div className="stat-footer">
                <span style={{ color: 'hsl(var(--text-muted))' }}>Endpoints configured</span>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span>Autoscalers (HPA)</span>
                <Sliders size={16} />
              </div>
              <div className="stat-value">{hpas.length}</div>
              <div className="stat-footer">
                <span style={{ color: 'hsl(var(--text-muted))' }}>
                  {hpas.length > 0 ? 'HPA scaling active' : 'None enabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Topology */}
          <div className="grid-cols-2">
            {/* Deployments list */}
            <div className="glass-panel">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Deployments
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deployments.length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))' }}>No deployments active in this namespace.</p>
                ) : (
                  deployments.map(dep => (
                    <div key={dep.name} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{dep.name}</span>
                        <span className={`status-badge ${dep.replicas === dep.available ? 'healthy' : 'progressing'}`}>
                          {dep.replicas === dep.available ? 'Healthy' : 'Scaling'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                        <span>Image: <code style={{ color: 'hsl(var(--secondary))' }}>{dep.image}</code></span>
                        <span>Replicas: <strong>{dep.available}/{dep.replicas}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Services & Routing */}
            <div className="glass-panel">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem' }}>Services & Ingress</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {services.length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))' }}>No services detected.</p>
                ) : (
                  services.map(svc => (
                    <div key={svc.name} className="resource-card" style={{ gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="resource-title">{svc.name}</span>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.4rem', background: 'hsla(var(--primary) / 0.15)', color: 'hsl(var(--primary))', borderRadius: '4px' }}>
                          {svc.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
                        <div>Cluster IP: <strong style={{ color: '#fff' }}>{svc.cluster_ip}</strong></div>
                        <div>Target Ports: <strong style={{ color: '#fff' }}>{svc.ports}</strong></div>
                        {svc.external_ip && (
                          <div style={{ color: 'hsl(var(--secondary))', fontWeight: 500 }}>LoadBalancer External IP: {svc.external_ip}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pod State and Live Logging Terminal */}
          <div className="glass-panel">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem' }}>Pod Status & Live Diagnostics Logs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
              
              {/* Pod Selector Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                {pods.map(pod => (
                  <div 
                    key={pod.name} 
                    onClick={() => setSelectedPod(pod.name)}
                    style={{
                      background: selectedPod === pod.name ? 'hsla(var(--primary) / 0.1)' : 'hsl(var(--bg-surface))',
                      borderColor: selectedPod === pod.name ? 'hsl(var(--primary))' : 'hsl(var(--border-color))',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '180px' }} title={pod.name}>
                        {pod.name}
                      </span>
                      <span className={`status-badge ${pod.status.toLowerCase() === 'running' ? 'healthy' : 'degraded'}`} style={{ fontSize: '0.65rem' }}>
                        {pod.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                      <span>Restarts: <strong style={{ color: '#fff' }}>{pod.restarts}</strong></span>
                      <span>CPU: <strong style={{ color: '#fff' }}>{pod.cpu}</strong></span>
                      <span>Mem: <strong style={{ color: '#fff' }}>{pod.memory}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Console log displayer */}
              <div className="terminal-container" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div className="terminal-title">Loki Pod Engine Terminal - {selectedPod || 'No Container selected'}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.7rem' }} 
                      onClick={() => setTerminalAutoScroll(!terminalAutoScroll)}
                    >
                      {terminalAutoScroll ? 'AutoScroll ON' : 'AutoScroll OFF'}
                    </button>
                  </div>
                </div>
                <div className="terminal-body" style={{ flexGrow: 1, color: '#f3f4f6', backgroundColor: '#020617' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{podLogs}</pre>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'gitops' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Reconciliation status banner */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: gitopsStatus.drift_detected ? 'hsl(var(--danger-glow))' : 'hsl(var(--success-glow))',
              border: `2px dashed ${gitopsStatus.drift_detected ? 'hsl(var(--danger))' : 'hsl(var(--success))'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {gitopsStatus.drift_detected ? (
                <AlertTriangle size={32} style={{ color: 'hsl(var(--danger))' }} />
              ) : (
                <CheckCircle size={32} style={{ color: 'hsl(var(--success))' }} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
                  Sync State: {gitopsStatus.sync_status}
                </h2>
                <span className={`status-badge ${gitopsStatus.drift_detected ? 'drifted' : 'synced'}`}>
                  {gitopsStatus.drift_detected ? 'Drift Detected' : 'Self-Healed'}
                </span>
              </div>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                ArgoCD reconciler continuously polling GitHub Repository: <code style={{ color: 'hsl(var(--secondary))' }}>{settings.GIT_REPO_URL}</code>
              </p>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
                <span>Desired Commit: <strong style={{ color: '#fff' }}>{gitopsStatus.git_commit || 'e8a9f02c'}</strong></span>
                <span>Active Cluster Commit: <strong style={{ color: '#fff' }}>{gitopsStatus.cluster_commit || 'e8a9f02c'}</strong></span>
                <span>Last Synced: <strong style={{ color: '#fff' }}>{gitopsStatus.last_sync_time}</strong></span>
              </div>
            </div>
          </div>

          {/* Drift & Reconciliation visualizer flow */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1.5rem' }}>GitOps Workflow Flow</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '2rem 0', position: 'relative' }}>
              
              {/* Box 1 Git Repo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2 }}>
                <div style={{ width: 64, height: 64, borderRadius: '16px', background: 'hsl(var(--bg-surface))', border: '2px solid hsl(var(--border-color))', display: 'flex', alignItems: 'center', justifycontent: 'center', justifyContent: 'center' }}>
                  <GitBranch size={28} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>GitHub (Source of Truth)</span>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--secondary))' }}>Commit {gitopsStatus.git_commit || 'e8a9f02c'}</span>
              </div>

              <ChevronRight size={24} style={{ color: 'hsl(var(--border-color))' }} />

              {/* Box 2 ArgoCD Controller */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'hsl(var(--bg-surface))',
                  border: `2px solid ${gitopsStatus.drift_detected ? 'hsl(var(--warning))' : 'hsl(var(--success))'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: gitopsStatus.drift_detected ? '0 0 15px hsl(var(--warning) / 0.2)' : '0 0 15px hsl(var(--success) / 0.2)'
                }}>
                  <RefreshCw size={28} style={{ color: gitopsStatus.drift_detected ? 'hsl(var(--warning))' : 'hsl(var(--success))' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>ArgoCD Engine</span>
                <span style={{ fontSize: '0.75rem', color: gitopsStatus.drift_detected ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
                  {gitopsStatus.drift_detected ? 'OutOfSync Alert' : 'Healthy Synced'}
                </span>
              </div>

              <ChevronRight size={24} style={{ color: 'hsl(var(--border-color))' }} />

              {/* Box 3 Live Cluster */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'hsl(var(--bg-surface))',
                  border: `2px solid ${gitopsStatus.drift_detected ? 'hsl(var(--danger))' : 'hsl(var(--success))'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Server size={28} style={{ color: gitopsStatus.drift_detected ? 'hsl(var(--danger))' : 'hsl(var(--success))' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Kubernetes Cluster</span>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Live State: Commit {gitopsStatus.cluster_commit}</span>
              </div>
            </div>

            {/* Reconciliation Log terminal */}
            {gitopsStatus.drift_detected ? (
              <div className="terminal-container" style={{ marginTop: '1rem' }}>
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div className="terminal-title">ArgoCD Drift Reconciliation Monitor</div>
                </div>
                <div className="terminal-body" style={{ color: 'hsl(var(--warning))' }}>
                  [DRIFT DETECTED] - 2026-06-03 22:35:45 - Cluster replica state differs from values-prod.yaml target in Git Repository.<br />
                  - Target replicas: 3<br />
                  - Cluster replicas: 5 (Modified manually via CLI)<br />
                  [ACTION REQUIRED] - Toggle automatic self-healing or click 'Reconcile Sync' above to prune/sync drift dynamically.
                </div>
              </div>
            ) : (
              <div className="terminal-container" style={{ marginTop: '1rem' }}>
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div className="terminal-title">ArgoCD Reconciliation Monitor</div>
                </div>
                <div className="terminal-body" style={{ color: 'hsl(var(--success))' }}>
                  [STATUS CHECK] - Cluster state matches target configurations in Helm values. Sync: OK.<br />
                  - Target replicas: 3<br />
                  - Cluster replicas: 3<br />
                  - Auto Sync: ENABLED<br />
                  - Self Healing: ACTIVE
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rollouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Progressive Delivery</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Deployment strategy manager querying Argo Rollouts custom object specs in the cluster.
            </p>

            {rollouts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'hsl(var(--bg-surface))', borderRadius: '12px', border: '1px solid hsl(var(--border-color))' }}>
                <Sliders size={32} style={{ color: 'hsl(var(--text-muted))', marginBottom: '0.5rem' }} />
                <h4 style={{ color: '#fff' }}>No Active Argo Rollouts</h4>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Argo Rollouts is currently configured for Staging and Production. Toggle environment upper-right to check profiles.
                </p>
              </div>
            ) : (
              rollouts.map(rollout => (
                <div key={rollout.name} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{rollout.name}</h3>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: 'hsla(var(--secondary) / 0.15)', color: 'hsl(var(--secondary))', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Strategy: {rollout.strategy}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`status-badge ${rollout.status.toLowerCase() === 'healthy' ? 'healthy' : 'progressing'}`}>
                        {rollout.status}
                      </span>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleRolloutAction('promote', rollout.name)}
                        disabled={rollout.status === 'Healthy' && rollout.canary_weight === 100}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      >
                        <Play size={12} />
                        Promote Step
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleRolloutAction('abort', rollout.name)}
                        disabled={rollout.status === 'Healthy' && rollout.canary_weight === 0}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'hsl(var(--danger) / 0.4)', color: 'hsl(var(--danger))' }}
                      >
                        Abort & Rollback
                      </button>
                    </div>
                  </div>

                  {rollout.strategy === 'Canary' ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.5rem' }}>
                        <span>Stable Weight: <strong>{rollout.stable_weight}%</strong> (Commit: <code>{rollout.stable_revision}</code>)</span>
                        <span>Canary Weight: <strong>{rollout.canary_weight}%</strong> (Commit: <code>{rollout.canary_revision}</code>)</span>
                      </div>
                      
                      {/* Traffic Shifting Visual Splitting Bar */}
                      <div className="split-visualizer">
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--primary))' }}>STABLE</div>
                        <div className="split-track">
                          <div className="split-stable" style={{ width: `${rollout.stable_weight}%` }}></div>
                          <div className="split-canary" style={{ width: `${rollout.canary_weight}%` }}></div>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--secondary))' }}>CANARY</div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Rollout step: <strong>{rollout.step} / {rollout.total_steps}</strong></span>
                        <span>Next Step: Promote to next traffic weight weight split.</span>
                      </div>
                    </div>
                  ) : (
                    // Blue-Green Profile layout
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                        <div style={{ background: rollout.active_color === 'Blue' ? 'rgba(59, 130, 246, 0.1)' : 'hsl(var(--bg-panel))', border: `1px solid ${rollout.active_color === 'Blue' ? '#3b82f6' : 'hsl(var(--border-color))'}`, padding: '1rem', borderRadius: '8px' }}>
                          <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: '0.25rem' }}>Blue Environment (Active Router)</div>
                          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                            Service Target: <code>{rollout.active_service}</code><br />
                            Revision Hash: <code>{rollout.active_revision}</code>
                          </div>
                        </div>
                        <div style={{ background: rollout.preview_color === 'Green' ? 'rgba(16, 185, 129, 0.1)' : 'hsl(var(--bg-panel))', border: `1px solid ${rollout.preview_color === 'Green' ? '#10b981' : 'hsl(var(--border-color))'}`, padding: '1rem', borderRadius: '8px' }}>
                          <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '0.25rem' }}>Green Environment (Preview Router)</div>
                          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                            Service Target: <code>{rollout.preview_service}</code><br />
                            Revision Hash: <code>{rollout.preview_revision}</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Prometheus Graph Visualizer */}
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} style={{ color: 'hsl(var(--primary))' }} />
                HTTP Request Load (Prometheus / Metrics)
              </h3>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsData}>
                    <defs>
                      <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" />
                    <XAxis dataKey="time" stroke="hsl(var(--text-muted))" fontSize={10} />
                    <YAxis stroke="hsl(var(--text-muted))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--bg-panel))', borderColor: 'hsl(var(--border-color))' }} />
                    <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#reqGrad)" name="Requests/sec" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} style={{ color: 'hsl(var(--secondary))' }} />
                Average API Latency (ms)
              </h3>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" />
                    <XAxis dataKey="time" stroke="hsl(var(--text-muted))" fontSize={10} />
                    <YAxis stroke="hsl(var(--text-muted))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--bg-panel))', borderColor: 'hsl(var(--border-color))' }} />
                    <Line type="monotone" dataKey="latency" stroke="hsl(var(--secondary))" strokeWidth={2} name="Latency (ms)" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Alertmanager panel */}
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: 'hsl(var(--danger))' }} />
              Active Alertmanager Alerts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  style={{
                    background: alert.severity === 'critical' ? 'hsl(var(--danger-glow))' : 'hsl(var(--warning-glow))',
                    border: `1px solid ${alert.severity === 'critical' ? 'hsl(var(--danger) / 0.4)' : 'hsl(var(--warning) / 0.4)'}`,
                    padding: '1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <strong style={{ color: alert.severity === 'critical' ? 'hsl(var(--danger))' : 'hsl(var(--warning))' }}>{alert.name}</strong>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.1rem 0.35rem', background: '#000', borderRadius: '4px' }}>{alert.severity}</span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Namespace: {alert.namespace}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>{alert.message}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {alert.age} ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'environments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Multi-Environment Configurations</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Configuration structures parsed from individual Helm values override files.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Dev Profile */}
              <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>Development (Dev)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Target Namespace:</span>
                    <strong>dev</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Replicas (Backend):</span>
                    <strong>1</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Auto-Sync:</span>
                    <span style={{ color: 'hsl(var(--success))' }}>Enabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Self-Healing:</span>
                    <span style={{ color: 'hsl(var(--success))' }}>Enabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Progressive Delivery:</span>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Disabled</span>
                  </div>
                </div>
              </div>

              {/* Staging Profile */}
              <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>Staging</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Target Namespace:</span>
                    <strong>staging</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Replicas (Backend):</span>
                    <strong>2</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Auto-Sync:</span>
                    <span style={{ color: 'hsl(var(--success))' }}>Enabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Self-Healing:</span>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Disabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Progressive Delivery:</span>
                    <span style={{ color: 'hsl(var(--secondary))' }}>Blue-Green Enabled</span>
                  </div>
                </div>
              </div>

              {/* Production Profile */}
              <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>Production (Prod)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Target Namespace:</span>
                    <strong>prod</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Replicas (Backend):</span>
                    <strong>3</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Auto-Sync:</span>
                    <span style={{ color: 'hsl(var(--success))' }}>Enabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Self-Healing:</span>
                    <span style={{ color: 'hsl(var(--success))' }}>Enabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>Progressive Delivery:</span>
                    <span style={{ color: 'hsl(var(--secondary))' }}>Canary 90/10 Enabled</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
