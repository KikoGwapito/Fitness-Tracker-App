import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, AlertTriangle, FileCode2, Trash2 } from 'lucide-react';
import { FoodLog, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  foodLogs: FoodLog[];
}

export function DataManagementModal({ isOpen, onClose, userProfile, foodLogs }: DataManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'statements' | 'reset'>('statements');
  const [exportTimeframeDays, setExportTimeframeDays] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning';
  } | null>(null);

  const handleExportHTML = () => {
    const now = Date.now();
    let daysToSubtract = exportTimeframeDays;
    const cutoff = now - (daysToSubtract * 24 * 60 * 60 * 1000);
    const filteredLogs = foodLogs.filter(log => log.timestamp >= cutoff).sort((a, b) => b.timestamp - a.timestamp);

    const userName = userProfile?.name || 'User';
    const accent = userProfile?.settings?.accentColor || '#FFA0A0';
    const startDateStr = new Date(cutoff).toLocaleDateString();
    const endDateStr = new Date(now).toLocaleDateString();

    let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
    filteredLogs.forEach(l => {
      totalCal += l.macros.calories || 0;
      totalPro += l.macros.protein || 0;
      totalCarb += l.macros.carbs || 0;
      totalFat += l.macros.fat || 0;
    });
    
    // Group logs by Date
    const groupedLogs: Record<string, FoodLog[]> = {};
    const chronologicalLogs = [...filteredLogs].sort((a, b) => a.timestamp - b.timestamp);
    
    chronologicalLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      if (!groupedLogs[dateStr]) groupedLogs[dateStr] = [];
      groupedLogs[dateStr].push(log);
    });

    const activeDays = Object.keys(groupedLogs).length;
    const avgCal = activeDays > 0 ? Math.round(totalCal / activeDays) : 0;

    // Prep data for Chart.js
    const chartLabels = Object.keys(groupedLogs);
    const chartDataCal = chartLabels.map(date => groupedLogs[date].reduce((sum, log) => sum + (log.macros.calories || 0), 0));
    const chartDataPro = chartLabels.map(date => groupedLogs[date].reduce((sum, log) => sum + (log.macros.protein || 0), 0));
    const chartDataCarb = chartLabels.map(date => groupedLogs[date].reduce((sum, log) => sum + (log.macros.carbs || 0), 0));
    const chartDataFat = chartLabels.map(date => groupedLogs[date].reduce((sum, log) => sum + (log.macros.fat || 0), 0));

    // Build the Daily Separated Tables
    let sectionsHtml = '';
    
    if (chartLabels.length === 0) {
      sectionsHtml = `<div class="card"><p style="text-align:center; color:#666; padding: 40px; margin: 0;">No logged meals in this period.</p></div>`;
    } else {
      // Show newest days first in the text breakdown
      const reversedLabels = [...chartLabels].reverse();
      
      reversedLabels.forEach((date, index) => {
        const dayLogs = groupedLogs[date];
        // Ensure a reliable parseable attribute for sorting
        const dayTimestamp = new Date(date).getTime();

        const dayCals = dayLogs.reduce((sum, log) => sum + (log.macros.calories || 0), 0);
        const dayPro = dayLogs.reduce((sum, log) => sum + (log.macros.protein || 0), 0);
        const dayCarb = dayLogs.reduce((sum, log) => sum + (log.macros.carbs || 0), 0);
        const dayFat = dayLogs.reduce((sum, log) => sum + (log.macros.fat || 0), 0);

        let rows = dayLogs.map(log => `
          <tr>
            <td style="width: 30%;"><strong>${log.foodName}</strong></td>
            <td style="color:${accent}; font-weight: bold; width: 20%;">${log.macros.calories} kcal</td>
            <td style="color:#aaa; width: 30%;"><span style="color:#3b82f6">${log.macros.protein}g</span> / <span style="color:#f59e0b">${log.macros.carbs}g</span> / <span style="color:#ef4444">${log.macros.fat}g</span></td>
            <td style="width: 20%;">
              <span style="display:inline-block; padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.1); font-size: 0.8rem;">
                ${log.health_score || '-'} / 10
              </span>
            </td>
          </tr>
        `).join('');

        sectionsHtml += `
          <div class="day-section" data-time="${dayTimestamp}">
            <div class="day-header">
              <div class="day-title">${date}</div>
              <div class="day-summary">
                <span style="color: ${accent}; font-weight: bold;">${dayCals} kcal</span> &bull; 
                <span style="color: #aaa;"><span style="color:#3b82f6">${dayPro}g</span> P / <span style="color:#f59e0b">${dayCarb}g</span> C / <span style="color:#ef4444">${dayFat}g</span> F</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Meal</th>
                  <th>Calories</th>
                  <th>Macros (P/C/F)</th>
                  <th>Health Score</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>G-Refine Statement - ${userName}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body { margin: 0; background-color: #050505; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; padding-top: 60px; }
        
        .toolbar { position: fixed; top: 0; left: 0; right: 0; background: rgba(5,5,5,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid #222; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
        .toolbar-brand { font-size: 0.9rem; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #fff; }
        .sort-control { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #888; }
        .sort-control select { background: #111; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; outline: none; cursor: pointer; }

        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 50px; }
        .brand { font-size: 3rem; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin-bottom: 10px; }
        .stroke { -webkit-text-stroke: 1px ${accent}; color: transparent; }
        .title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 3px; color: #888; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; position: relative; overflow: hidden; }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${accent}; opacity: 0.2; }
        .card-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 10px; }
        .card-value { font-size: 2.4rem; font-weight: 700; color: ${accent}; line-height: 1.1; }
        .card-sub { font-size: 0.8rem; color: #888; margin-top: 10px; }

        .section-title { font-size: 1.2rem; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; color: #fff; padding-bottom: 10px; border-bottom: 1px solid #222; }

        .chart-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 60px; }
        @media (min-width: 768px) { .chart-grid { grid-template-columns: 1fr 1fr; } }
        .chart-container-large { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; position: relative; height: 350px; width: 100%; box-sizing: border-box; grid-column: 1 / -1; }
        .chart-container-small { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; position: relative; height: 250px; width: 100%; box-sizing: border-box; }
        
        .day-section { background: #111; border: 1px solid #222; border-radius: 16px; margin-bottom: 24px; overflow: hidden; transition: transform 0.2s ease; }
        .day-section:hover { border-color: #333; transform: translateY(-2px); }
        .day-header { background: #161616; padding: 20px 24px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .day-title { font-size: 1.1rem; font-weight: bold; color: #fff; }
        .day-summary { font-size: 0.95rem; }
        
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: #666; padding: 16px 24px; border-bottom: 1px solid #222; background: #0a0a0a; }
        td { padding: 16px 24px; border-bottom: 1px solid #222; font-size: 0.95rem; }
        tr:last-child td { border-bottom: none; }
        
        .footer { text-align: center; margin-top: 80px; font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 40px; }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div class="toolbar-brand">G-<span class="stroke">Refine</span></div>
        <div style="display: flex; gap: 16px; align-items: center;">
          <input type="text" placeholder="Search date..." onkeyup="window.filterDates(this.value)" style="background: #111; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; outline: none; font-size: 0.8rem;" />
          <div class="sort-control">
            Order: 
            <select id="sortDate" onchange="window.sortRecords(this.value)">
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="header">
          <div class="brand">G-<span class="stroke">Refine</span></div>
          <div class="title">Official Progress Statement</div>
          <div style="color: #aaa; margin-top: 15px; font-size: 0.9rem;">${startDateStr} &mdash; ${endDateStr}</div>
          <div style="color: #fff; margin-top: 15px; font-weight: 500; font-size: 1.2rem; background: #111; display: inline-block; padding: 8px 24px; border-radius: 30px; border: 1px solid #222;">Client: ${userName}</div>
        </div>

        <div class="section-title">Period Summary</div>
        <div class="summary-grid">
          <div class="card">
            <div class="card-title">Active Days</div>
            <div class="card-value">${activeDays}</div>
            <div class="card-sub">Days with recorded meals</div>
          </div>
          <div class="card">
            <div class="card-title">Daily Avg Calories</div>
            <div class="card-value">${avgCal}</div>
            <div class="card-sub">Across active days</div>
          </div>
          <div class="card">
            <div class="card-title">Total Macros</div>
            <div class="card-value" style="font-size: 1.2rem; color: #fff; line-height: 1.6;">
              <span style="color:#3b82f6">${totalPro}g</span> Protein<br/>
              <span style="color:#f59e0b">${totalCarb}g</span> Carbs<br/>
              <span style="color:#ef4444">${totalFat}g</span> Fat
            </div>
            <div class="card-sub">Cumulative sum</div>
          </div>
        </div>

        ${chartLabels.length > 0 ? `
        <div class="section-title">Macro Visualization</div>
        <div class="chart-grid">
          <div class="chart-container-large">
            <canvas id="calChart"></canvas>
          </div>
          <div class="chart-container-small">
            <canvas id="proChart"></canvas>
          </div>
          <div class="chart-container-small">
            <canvas id="carbFatChart"></canvas>
          </div>
        </div>
        ` : ''}

        <div class="section-title" style="margin-top: 40px;">Daily Ledger</div>
        <div id="records-container">
          ${sectionsHtml}
        </div>

        <div class="footer">
          Generated automatically by Coach Gref &bull; Keep refining.
        </div>
      </div>
      
      <script>
        const chartLabels = ${JSON.stringify(chartLabels)};
        const chartCal = ${JSON.stringify(chartDataCal)};
        const chartPro = ${JSON.stringify(chartDataPro)};
        const chartCarb = ${JSON.stringify(chartDataCarb)};
        const chartFat = ${JSON.stringify(chartDataFat)};
        
        // Sorting Logic
        window.sortRecords = function(order) {
          const container = document.getElementById('records-container');
          const sections = Array.from(container.getElementsByClassName('day-section'));
          
          sections.sort((a, b) => {
            const timeA = parseInt(a.getAttribute('data-time'));
            const timeB = parseInt(b.getAttribute('data-time'));
            return order === 'desc' ? timeB - timeA : timeA - timeB;
          });
          
          // Re-append in new order
          sections.forEach(sec => container.appendChild(sec));
        };

        // Filtering Logic
        window.filterDates = function(query) {
          const q = query.toLowerCase();
          const sections = document.querySelectorAll('.day-section');
          sections.forEach(sec => {
            const title = sec.querySelector('.day-title').innerText.toLowerCase();
            if (title.includes(q)) {
              sec.style.display = 'block';
            } else {
              sec.style.display = 'none';
            }
          });
        };

        if (chartLabels.length > 0) {
          // Common Theme Options
          Chart.defaults.color = '#888';
          Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          
          const gridOptions = { color: '#222', drawBorder: false };
          
          // 1. Calories Line Chart (Main)
          const ctxCal = document.getElementById('calChart').getContext('2d');
          const gradCal = ctxCal.createLinearGradient(0, 0, 0, 350);
          gradCal.addColorStop(0, '${accent}80');
          gradCal.addColorStop(1, '${accent}00');
          
          new Chart(ctxCal, {
            type: 'line',
            data: {
              labels: chartLabels,
              datasets: [{
                label: 'Calories',
                data: chartCal,
                borderColor: '${accent}',
                backgroundColor: gradCal,
                borderWidth: 3,
                pointBackgroundColor: '${accent}',
                pointBorderColor: '#111',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: true, text: 'Calorie Trend (kcal)', color: '#fff', align: 'start', font: { size: 14 } },
                tooltip: { backgroundColor: '#222', titleColor: '#fff', padding: 12, displayColors: false }
              },
              scales: { x: { grid: gridOptions }, y: { beginAtZero: true, grid: gridOptions } }
            }
          });

          // 2. Protein Bar Chart
          const ctxPro = document.getElementById('proChart').getContext('2d');
          new Chart(ctxPro, {
            type: 'bar',
            data: {
              labels: chartLabels,
              datasets: [{
                label: 'Protein (g)',
                data: chartPro,
                backgroundColor: '#3b82f6',
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: true, text: 'Protein Intra-day (g)', color: '#fff', align: 'start', font: { size: 14 } },
                tooltip: { backgroundColor: '#222', padding: 12, displayColors: false }
              },
              scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: gridOptions } }
            }
          });

          // 3. Carbs vs Fat Combo Bar Chart
          const ctxCF = document.getElementById('carbFatChart').getContext('2d');
          new Chart(ctxCF, {
            type: 'bar',
            data: {
              labels: chartLabels,
              datasets: [
                {
                  label: 'Carbs (g)',
                  data: chartCarb,
                  backgroundColor: '#f59e0b',
                  borderRadius: 4
                },
                {
                  label: 'Fat (g)',
                  data: chartFat,
                  backgroundColor: '#ef4444',
                  borderRadius: 4
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { color: '#888', boxWidth: 12 } },
                title: { display: true, text: 'Carbs vs Fat (g)', color: '#fff', align: 'start', font: { size: 14 } },
                tooltip: { backgroundColor: '#222', padding: 12 }
              },
              scales: { 
                x: { grid: { display: false } }, 
                y: { beginAtZero: true, grid: gridOptions } 
              }
            }
          });
        }
      </script>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `G-Refine_Statement_${exportTimeframeDays}d_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset All Data',
      message: 'Are you sure you want to delete all your logs and reset your account? We strongly recommend downloading your statement first. This cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsProcessing(true);
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (!user) return;

          let operationsCount = 0;
          let batch = writeBatch(db);

          const commitBatch = async () => {
            await batch.commit();
            batch = writeBatch(db);
            operationsCount = 0;
          };

          for (const log of foodLogs) {
            const docRef = doc(db, 'users', user.uid, 'food_logs', log.id);
            batch.delete(docRef);
            operationsCount++;
            if (operationsCount >= 400) await commitBatch();
          }
          
          if (operationsCount > 0) {
            await commitBatch();
          }
          alert("Data has been successfully reset. The ledger is clean.");
          onClose();
        } catch (err) {
          console.error("Reset failed", err);
          alert("Failed to reset data. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleResetWithStatementPrompt = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Download Statement First?',
      message: 'Would you like to download your HTML statement as a permanent record before wiping the app?',
      variant: 'warning',
      onConfirm: () => {
        setConfirmModal(null);
        setActiveTab('statements');
      }
    });
  };


  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 sm:pb-32 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%', scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: '100%', scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="relative w-full max-w-lg vonas-card overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                <h2 className="text-xl font-display uppercase tracking-widest text-white">Statements & Reports</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="flex border-b border-white/10 shrink-0">
                <button 
                  onClick={() => setActiveTab('statements')}
                  className={cn("flex-1 py-4 text-[10px] font-display uppercase tracking-widest transition-colors", activeTab === 'statements' ? "text-accent border-b-2 border-accent" : "text-white/40 hover:text-white")}
                >
                  Download Statements
                </button>
                <button 
                  onClick={() => setActiveTab('reset')}
                  className={cn("flex-1 py-4 text-[10px] font-display uppercase tracking-widest transition-colors", activeTab === 'reset' ? "text-danger border-b-2 border-danger" : "text-white/40 hover:text-white")}
                >
                  Reset History
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {activeTab === 'statements' && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <FileCode2 className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="text-sm font-display uppercase tracking-widest text-white mb-2">Interactive HTML Reports</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                        Generate a professional, self-contained HTML file of your progress. You can view it entirely offline in any web browser and keep it as a permanent record.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-display uppercase tracking-widest text-white/40">Statement Period (Days: 7 to 365)</label>
                      <input 
                        type="number"
                        min={7}
                        max={365}
                        value={exportTimeframeDays}
                        onChange={(e) => {
                          let val = parseInt(e.target.value);
                          if (isNaN(val)) val = 30;
                          setExportTimeframeDays(val);
                        }}
                        onBlur={() => {
                          if (exportTimeframeDays < 7) setExportTimeframeDays(7);
                          if (exportTimeframeDays > 365) setExportTimeframeDays(365);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent transition-all font-light"
                      />
                    </div>

                    <button 
                      onClick={handleExportHTML}
                      className="vonas-button vonas-button-primary w-full py-4 mt-2"
                    >
                      <Download className="w-5 h-5" />
                      Generate & Download
                    </button>
                  </div>
                )}

                {activeTab === 'reset' && (
                  <div className="space-y-6 flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mb-2">
                      <Trash2 className="w-8 h-8 text-danger" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display uppercase tracking-widest text-white mb-2">Danger Zone</h3>
                      <p className="text-xs text-white/40 leading-relaxed max-w-sm mx-auto">
                        This action will permanently delete all your meal logs from the cloud database to free up space. It cannot be undone.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full mt-4">
                      <button 
                        onClick={handleResetWithStatementPrompt}
                        disabled={isProcessing}
                        className="vonas-button w-full py-4 bg-white/5 hover:bg-white/10 text-white"
                      >
                        {isProcessing ? 'Deleting records...' : 'Clear All Records'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative bg-white/5 border backdrop-blur-md rounded-3xl p-6 max-w-sm w-full text-center space-y-6",
                confirmModal.variant === 'danger' ? "border-danger/20" : "border-amber-500/20"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full mx-auto flex items-center justify-center",
                confirmModal.variant === 'danger' ? "bg-danger/10 text-danger" : "bg-amber-500/10 text-amber-500"
              )}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-display uppercase tracking-widest text-white mb-2">{confirmModal.title}</h3>
                <p className="text-sm font-light text-white/60">{confirmModal.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)} 
                  className="flex-1 py-4 rounded-xl text-xs font-display uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const cb = confirmModal.onConfirm;
                    cb();
                  }} 
                  className={cn(
                    "flex-1 py-4 rounded-xl text-xs font-display uppercase tracking-widest transition-colors",
                    confirmModal.variant === 'danger' ? "bg-danger hover:bg-danger/80 text-white" : "bg-accent hover:bg-accent/80 text-bg"
                  )}
                >
                  Proceed
                </button>
              </div>
              {confirmModal.title === 'Download Statement First?' && (
                <div className="pt-2">
                  <button onClick={handleResetData} className="text-[10px] text-danger hover:underline uppercase tracking-widest font-display">Skip Backup & Delete Anyway</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
