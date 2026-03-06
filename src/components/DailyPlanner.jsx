import { useState, useEffect, useCallback } from "react";
import { useSync } from "../useSync";

const DEFAULT_CATEGORIES = [
  { id: "work", label: "Work", icon: "\uD83D\uDCBC", color: "#E8590C", bg: "#FFF4E6", desc: "Tasks & deadlines" },
  { id: "learn", label: "Learning", icon: "\uD83D\uDCDA", color: "#1971C2", bg: "#E7F5FF", desc: "Skills & courses" },
  { id: "health", label: "Health", icon: "\uD83C\uDFCB", color: "#2F9E44", bg: "#EBFBEE", desc: "Exercise & wellness" },
  { id: "personal", label: "Personal", icon: "\u2B50", color: "#5F3DC4", bg: "#F3F0FF", desc: "Goals & habits" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const QUOTES = [
  "Consistency beats intensity. Show up daily.",
  "Small steps every day lead to big results.",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus on progress, not perfection.",
  "The best time to start was yesterday. The next best time is now.",
  "Discipline is choosing between what you want now and what you want most.",
  "Done is better than perfect.",
  "A little progress each day adds up to big results.",
];

const STORAGE_KEY = "planner-data";
const CATEGORIES_KEY = "planner-categories";

const COLOR_OPTIONS = [
  { color: "#E8590C", bg: "#FFF4E6" },
  { color: "#1971C2", bg: "#E7F5FF" },
  { color: "#5F3DC4", bg: "#F3F0FF" },
  { color: "#2F9E44", bg: "#EBFBEE" },
  { color: "#E03131", bg: "#FFF5F5" },
  { color: "#C2255C", bg: "#FFF0F6" },
  { color: "#0C8599", bg: "#E3FAFC" },
  { color: "#862E9C", bg: "#F8F0FC" },
];

const DAILY_CHALLENGES = [
  { text: "Do the hardest task on your list first", icon: "\uD83E\uDDE0" },
  { text: "Take a 5-minute break every 25 minutes", icon: "\u23F1\uFE0F" },
  { text: "Write down 3 things you're grateful for", icon: "\uD83D\uDCDD" },
  { text: "Teach someone one new thing you learned", icon: "\uD83D\uDCA1" },
  { text: "Spend 10 minutes organizing your workspace", icon: "\uD83E\uDDF9" },
  { text: "Read something for 15 minutes today", icon: "\uD83D\uDCDA" },
  { text: "Reach out to someone you haven't talked to in a while", icon: "\uD83D\uDE04" },
];

const FUN_FACTS = [
  "The first computer bug was an actual moth found in a Harvard computer in 1947.",
  "The average developer mass-produces about 100 lines of code per day.",
  "Git was created by Linus Torvalds in just 10 days.",
  "The first programmer was Ada Lovelace in the 1840s.",
  "JavaScript was created in just 10 days by Brendan Eich.",
  "There are ~700 programming languages in the world.",
  "The first 1GB hard drive (1980) weighed 550 pounds and cost $40,000.",
  "Python is named after Monty Python, not the snake.",
  "The term 'debugging' literally came from removing bugs from hardware.",
  "NASA's Apollo 11 computer had less power than a modern calculator.",
  "The @ symbol in email was chosen because it was rarely used in text.",
  "The QWERTY keyboard was designed to slow typists down to prevent jamming.",
  "Google's first storage was made of LEGO bricks.",
  "The first website is still live at info.cern.ch.",
];

const DEFAULT_SUBTASKS = {
  work: ["Complete top priority task", "Reply to pending messages", "Plan tomorrow's tasks"],
  learn: ["Study for 30 minutes", "Take notes on key concepts", "Practice what you learned"],
  health: ["Exercise for 20 minutes", "Drink 8 glasses of water", "Get 7+ hours of sleep"],
  personal: ["Work on a personal goal", "Read for 15 minutes", "Do something creative"],
};

const getToday = () => new Date().toISOString().split("T")[0];
const getWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split("T")[0];
  });
};

export default function DailyPlanner() {
  const {
    value: data,
    save: saveData,
    syncCode,
    syncing,
    cloudReady,
    createSyncCode,
    joinSyncCode,
    disconnectSync,
  } = useSync(STORAGE_KEY, {});

  const {
    value: categories,
    save: saveCategories,
  } = useSync(CATEGORIES_KEY, DEFAULT_CATEGORIES);

  const [activeTab, setActiveTab] = useState("today");
  const [expandedCat, setExpandedCat] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState("");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({ label: "", icon: "", desc: "", color: "#E8590C", bg: "#FFF4E6" });
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loaded, setLoaded] = useState(false);

  const today = getToday();
  const weekDates = getWeekDates();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  useEffect(() => {
    // Small delay to let useSync load from localStorage
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const defaultTasks = () =>
    categories.reduce((acc, cat) => {
      acc[cat.id] = { done: false, notes: "", subtasks: [] };
      return acc;
    }, {});

  const getTodayData = () => data[today] || defaultTasks();

  // Initialize subtasks as { text, done } objects
  const getSubtasks = (catId, catData) => {
    if (catData.subtasks?.length && typeof catData.subtasks[0] === "object") {
      return catData.subtasks;
    }
    // Migrate from old boolean format or initialize from defaults
    const defaults = DEFAULT_SUBTASKS[catId] || [];
    if (catData.subtasks?.length && typeof catData.subtasks[0] === "boolean") {
      return defaults.map((text, i) => ({ text, done: catData.subtasks[i] || false }));
    }
    return defaults.map((text) => ({ text, done: false }));
  };

  const saveSubtasks = (catId, subtasks) => {
    const todayData = getTodayData();
    const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);
    const updated = {
      ...data,
      [today]: {
        ...todayData,
        [catId]: { ...todayData[catId], subtasks, done: allDone },
      },
    };
    saveData(updated);
  };

  const toggleTask = (catId) => {
    const todayData = getTodayData();
    const updated = {
      ...data,
      [today]: {
        ...todayData,
        [catId]: { ...todayData[catId], done: !todayData[catId]?.done },
      },
    };
    saveData(updated);
  };

  const toggleSubtask = (catId, idx) => {
    const todayData = getTodayData();
    const catData = todayData[catId] || { done: false, notes: "", subtasks: [] };
    const subtasks = getSubtasks(catId, catData);
    const updated = subtasks.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
    saveSubtasks(catId, updated);
  };

  const addSubtask = (catId, text) => {
    if (!text.trim()) return;
    const todayData = getTodayData();
    const catData = todayData[catId] || { done: false, notes: "", subtasks: [] };
    const subtasks = getSubtasks(catId, catData);
    saveSubtasks(catId, [...subtasks, { text: text.trim(), done: false }]);
    setNewSubtaskText("");
  };

  const deleteSubtask = (catId, idx) => {
    const todayData = getTodayData();
    const catData = todayData[catId] || { done: false, notes: "", subtasks: [] };
    const subtasks = getSubtasks(catId, catData);
    saveSubtasks(catId, subtasks.filter((_, i) => i !== idx));
  };

  const editSubtask = (catId, idx, newText) => {
    if (!newText.trim()) return;
    const todayData = getTodayData();
    const catData = todayData[catId] || { done: false, notes: "", subtasks: [] };
    const subtasks = getSubtasks(catId, catData);
    const updated = subtasks.map((s, i) => (i === idx ? { ...s, text: newText.trim() } : s));
    saveSubtasks(catId, updated);
    setEditingSubtask(null);
  };

  const updateNote = (catId, note) => {
    const todayData = getTodayData();
    const updated = {
      ...data,
      [today]: {
        ...todayData,
        [catId]: { ...todayData[catId], notes: note },
      },
    };
    saveData(updated);
  };

  const getStreak = (catId) => {
    let streak = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1);
    while (true) {
      const key = d.toISOString().split("T")[0];
      if (data[key]?.[catId]?.done) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    if (getTodayData()[catId]?.done) streak++;
    return streak;
  };

  const getTodayProgress = () => {
    const td = getTodayData();
    const done = categories.filter((c) => td[c.id]?.done).length;
    return categories.length ? Math.round((done / categories.length) * 100) : 0;
  };

  const getWeekData = (catId) =>
    weekDates.map((date) => ({
      date,
      done: data[date]?.[catId]?.done || false,
    }));

  const resetToday = () => {
    const updated = { ...data };
    delete updated[today];
    saveData(updated);
  };

  // Category CRUD
  const addCategory = () => {
    if (!catForm.label.trim()) return;
    const id = catForm.label.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const newCat = { id, label: catForm.label.trim(), icon: catForm.icon || "\uD83D\uDCCC", desc: catForm.desc.trim(), color: catForm.color, bg: catForm.bg };
    saveCategories([...categories, newCat]);
    setCatForm({ label: "", icon: "", desc: "", color: "#E8590C", bg: "#FFF4E6" });
    setShowAddCategory(false);
  };

  const updateCategory = () => {
    if (!catForm.label.trim() || !editingCategory) return;
    const updated = categories.map((c) =>
      c.id === editingCategory ? { ...c, label: catForm.label.trim(), icon: catForm.icon || "\uD83D\uDCCC", desc: catForm.desc.trim(), color: catForm.color, bg: catForm.bg } : c
    );
    saveCategories(updated);
    setCatForm({ label: "", icon: "", desc: "", color: "#E8590C", bg: "#FFF4E6" });
    setEditingCategory(null);
  };

  const deleteCategory = (catId) => {
    saveCategories(categories.filter((c) => c.id !== catId));
    if (expandedCat === catId) setExpandedCat(null);
  };

  const startEditCategory = (cat) => {
    setCatForm({ label: cat.label, icon: cat.icon, desc: cat.desc, color: cat.color, bg: cat.bg });
    setEditingCategory(cat.id);
    setShowAddCategory(false);
  };

  if (!loaded) {
    return (
      <div style={styles.loadScreen}>
        <div style={styles.loadIcon}>{"\uD83D\uDCCB"}</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#868E96" }}>Loading your planner...</p>
      </div>
    );
  }

  const progress = getTodayProgress();
  const todayData = getTodayData();

  return (
    <div style={styles.root}>
      {/* Progress Ring */}
      <div style={styles.progressSection}>
        <div style={styles.progressRing}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E9ECEF" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={progress === 100 ? "#2F9E44" : "#E8590C"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 264} 264`}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div style={styles.progressText}>
            <span style={styles.progressNum}>{progress}%</span>
            <span style={styles.progressLabel}>done</span>
          </div>
        </div>
        <div style={styles.progressInfo}>
          <p style={styles.progressTitle}>
            {progress === 100 ? "\uD83C\uDF89 All Done!" : progress >= 50 ? "\uD83D\uDCAA Keep Going!" : "\uD83D\uDE80 Let's Start!"}
          </p>
          <p style={styles.progressSub}>
            {categories.filter((c) => todayData[c.id]?.done).length}/{categories.length} categories completed
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["today", "week"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
          >
            {tab === "today" ? "\uD83D\uDCC5 Today" : "\uD83D\uDCCA Week View"}
          </button>
        ))}
      </div>

      {/* Today View */}
      {activeTab === "today" && (
        <div style={styles.cards}>
          {categories.map((cat) => {
            const isExpanded = expandedCat === cat.id;
            const catData = todayData[cat.id] || { done: false, notes: "", subtasks: [] };
            const subtasks = getSubtasks(cat.id, catData);
            const subDone = subtasks.filter((s) => s.done).length;
            const streak = getStreak(cat.id);

            return (
              <div
                key={cat.id}
                style={{
                  ...styles.card,
                  borderLeft: `4px solid ${cat.color}`,
                  background: catData.done ? cat.bg : "#fff",
                }}
              >
                <div
                  style={styles.cardHeader}
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  <div style={styles.cardLeft}>
                    <span style={styles.catIcon}>{cat.icon}</span>
                    <div>
                      <h3 style={{ ...styles.catLabel, color: cat.color }}>{cat.label}</h3>
                      <p style={styles.catDesc}>{cat.desc}</p>
                    </div>
                  </div>
                  <div style={styles.cardRight}>
                    {streak > 0 && (
                      <span style={{ ...styles.streak, background: cat.bg, color: cat.color }}>
                        {"\uD83D\uDD25"} {streak}d
                      </span>
                    )}
                    <span style={styles.subProgress}>
                      {subDone}/{subtasks.length}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTask(cat.id); }}
                      style={{
                        ...styles.checkBtn,
                        background: catData.done ? cat.color : "transparent",
                        borderColor: cat.color,
                      }}
                    >
                      {catData.done && "\u2713"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={styles.expanded}>
                    {/* Subtasks */}
                    <div style={styles.subtasks}>
                      {subtasks.map((task, idx) => (
                        <div key={idx} style={styles.subtask}>
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => toggleSubtask(cat.id, idx)}
                            style={styles.subCheck}
                          />
                          {editingSubtask?.catId === cat.id && editingSubtask?.idx === idx ? (
                            <input
                              autoFocus
                              style={styles.subtaskEditInput}
                              value={editingSubtaskText}
                              onChange={(e) => setEditingSubtaskText(e.target.value)}
                              onBlur={() => editSubtask(cat.id, idx, editingSubtaskText)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") editSubtask(cat.id, idx, editingSubtaskText);
                                if (e.key === "Escape") setEditingSubtask(null);
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                ...styles.subText,
                                textDecoration: task.done ? "line-through" : "none",
                                opacity: task.done ? 0.5 : 1,
                                flex: 1,
                              }}
                              onDoubleClick={() => {
                                setEditingSubtask({ catId: cat.id, idx });
                                setEditingSubtaskText(task.text);
                              }}
                            >
                              {task.text}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingSubtask({ catId: cat.id, idx });
                              setEditingSubtaskText(task.text);
                            }}
                            style={styles.subtaskBtn}
                            title="Edit"
                          >
                            {"\u270F\uFE0F"}
                          </button>
                          <button
                            onClick={() => deleteSubtask(cat.id, idx)}
                            style={{ ...styles.subtaskBtn, color: "#E03131" }}
                            title="Delete"
                          >
                            {"\u2716"}
                          </button>
                        </div>
                      ))}

                      {/* Add task — inline like a subtask row */}
                      <div style={styles.subtask}>
                        <span style={{ ...styles.subCheck, display: "flex", alignItems: "center", justifyContent: "center", color: cat.color, fontSize: 16, fontWeight: 700 }}>+</span>
                        <input
                          style={styles.addSubtaskInline}
                          placeholder="Add task..."
                          value={expandedCat === cat.id ? newSubtaskText : ""}
                          onChange={(e) => setNewSubtaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addSubtask(cat.id, newSubtaskText);
                          }}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div style={styles.noteSection}>
                      {editingNote === cat.id ? (
                        <textarea
                          autoFocus
                          style={styles.noteInput}
                          value={catData.notes || ""}
                          placeholder="Add a note..."
                          onChange={(e) => updateNote(cat.id, e.target.value)}
                          onBlur={() => setEditingNote(null)}
                          rows={2}
                        />
                      ) : (
                        <div
                          onClick={() => setEditingNote(cat.id)}
                          style={styles.noteDisplay}
                        >
                          {catData.notes || "Tap to add notes..."}
                        </div>
                      )}
                    </div>

                    {/* Category actions — minimal, bottom-right */}
                    <div style={styles.catActions}>
                      <button onClick={() => startEditCategory(cat)} style={styles.catActionBtn} title="Edit category">
                        {"\u270F\uFE0F"}
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} style={{ ...styles.catActionBtn, color: "#E03131" }} title="Delete category">
                        {"\uD83D\uDDD1\uFE0F"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category */}
          <button
            onClick={() => {
              setShowAddCategory(true);
              setEditingCategory(null);
              setCatForm({ label: "", icon: "", desc: "", color: "#E8590C", bg: "#FFF4E6" });
            }}
            style={styles.addCatBtn}
          >
            + Category
          </button>

          {/* Daily Insight Card */}
          {(() => {
            const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
            const challenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
            const fact = FUN_FACTS[dayOfYear % FUN_FACTS.length];
            const bestStreak = Math.max(...categories.map((c) => getStreak(c.id)), 0);
            const totalDone = categories.filter((c) => todayData[c.id]?.done).length;
            const totalTasks = categories.reduce((sum, cat) => {
              const catData = todayData[cat.id] || { subtasks: [] };
              const subs = getSubtasks(cat.id, catData);
              return sum + subs.filter((s) => s.done).length;
            }, 0);

            return (
              <div style={styles.insightCard}>
                {/* Daily Challenge */}
                <div style={styles.challengeRow}>
                  <span style={styles.challengeIcon}>{challenge.icon}</span>
                  <div>
                    <p style={styles.challengeLabel}>Today's Challenge</p>
                    <p style={styles.challengeText}>{challenge.text}</p>
                  </div>
                </div>

                {/* Mini Stats */}
                <div style={styles.miniStats}>
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatNum}>{totalTasks}</span>
                    <span style={styles.miniStatLabel}>tasks done</span>
                  </div>
                  <div style={styles.miniStatDivider} />
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatNum}>{bestStreak}</span>
                    <span style={styles.miniStatLabel}>best streak</span>
                  </div>
                  <div style={styles.miniStatDivider} />
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatNum}>{totalDone}/{categories.length}</span>
                    <span style={styles.miniStatLabel}>categories</span>
                  </div>
                </div>

                {/* Fun Fact */}
                <div style={styles.funFact}>
                  <span style={styles.funFactIcon}>{"\uD83E\uDD13"}</span>
                  <p style={styles.funFactText}>{fact}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Category Form Modal */}
      {(showAddCategory || editingCategory) && (
        <div style={styles.overlay} onClick={() => { setShowAddCategory(false); setEditingCategory(null); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingCategory ? "Edit Category" : "Add Category"}
            </h3>
            <input
              style={styles.modalInput}
              placeholder="Label (e.g. System Design)"
              value={catForm.label}
              onChange={(e) => setCatForm({ ...catForm, label: e.target.value })}
            />
            <input
              style={styles.modalInput}
              placeholder="Icon emoji (e.g. \uD83D\uDCA1)"
              value={catForm.icon}
              onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
            />
            <input
              style={styles.modalInput}
              placeholder="Description"
              value={catForm.desc}
              onChange={(e) => setCatForm({ ...catForm, desc: e.target.value })}
            />
            <p style={{ margin: "8px 0 4px", fontSize: 12, fontWeight: 600, color: "#868E96" }}>Color</p>
            <div style={styles.colorPicker}>
              {COLOR_OPTIONS.map((opt) => (
                <div
                  key={opt.color}
                  onClick={() => setCatForm({ ...catForm, color: opt.color, bg: opt.bg })}
                  style={{
                    ...styles.colorDot,
                    background: opt.color,
                    outline: catForm.color === opt.color ? "3px solid " + opt.color : "2px solid #E9ECEF",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => { setShowAddCategory(false); setEditingCategory(null); }}
                style={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? updateCategory : addCategory}
                style={{ ...styles.modalSaveBtn, background: catForm.color }}
              >
                {editingCategory ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {activeTab === "week" && (
        <div style={styles.weekView}>
          {categories.map((cat) => {
            const week = getWeekData(cat.id);
            const weekDone = week.filter((d) => d.done).length;
            return (
              <div key={cat.id} style={{ ...styles.weekCard, borderLeft: `4px solid ${cat.color}` }}>
                <div style={styles.weekHeader}>
                  <span>{cat.icon} {cat.label}</span>
                  <span style={{ ...styles.weekCount, color: cat.color }}>{weekDone}/7</span>
                </div>
                <div style={styles.weekGrid}>
                  {week.map((d, i) => (
                    <div key={d.date} style={styles.weekDay}>
                      <span style={styles.dayLabel}>{DAYS[i]}</span>
                      <div
                        style={{
                          ...styles.dayDot,
                          background: d.done ? cat.color : "#E9ECEF",
                          color: d.done ? "#fff" : "#ADB5BD",
                        }}
                      >
                        {d.done ? "\u2713" : "\u00B7"}
                      </div>
                      {d.date === today && <div style={{ ...styles.todayDot, background: cat.color }} />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Summary Stats */}
          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>{"\uD83D\uDCC8"} Your Streaks</h3>
            <div style={styles.statsGrid}>
              {categories.map((cat) => {
                const streak = getStreak(cat.id);
                return (
                  <div key={cat.id} style={styles.statItem}>
                    <span style={styles.statEmoji}>{cat.icon}</span>
                    <span style={{ ...styles.statNum, color: cat.color }}>{streak}</span>
                    <span style={styles.statLabel}>days</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>"{quote}"</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowSyncPanel(true)} style={styles.syncBtn}>
            {syncCode ? (syncing ? "\u21BB" : "\u2601") : "\u26A1"} {syncCode ? "Synced" : "Sync"}
          </button>
          <button onClick={resetToday} style={styles.resetBtn} title="Reset today's progress">
            {"\u21BA"} Reset
          </button>
        </div>
      </div>

      {/* Sync Panel */}
      {showSyncPanel && (
        <div style={styles.overlay} onClick={() => setShowSyncPanel(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{"\u2601"} Sync Across Devices</h3>

            {!cloudReady ? (
              <div style={styles.syncInfo}>
                <p style={styles.syncInfoText}>
                  Firebase not configured yet. Add your config in <strong>src/firebase.js</strong> to enable cloud sync.
                </p>
                <p style={{ ...styles.syncInfoText, marginTop: 8 }}>
                  1. Go to console.firebase.google.com{"\n"}
                  2. Create a project{"\n"}
                  3. Add a web app{"\n"}
                  4. Enable Firestore{"\n"}
                  5. Paste config in src/firebase.js
                </p>
              </div>
            ) : !syncCode ? (
              <div>
                <p style={styles.syncInfoText}>
                  Create a sync code to access your data from any device, or join an existing one.
                </p>
                <button
                  onClick={() => {
                    const code = createSyncCode();
                    setJoinCode(code);
                  }}
                  style={{ ...styles.modalSaveBtn, background: "#2F9E44", width: "100%", marginTop: 12, marginBottom: 12, padding: "12px" }}
                >
                  Generate Sync Code
                </button>
                <div style={styles.syncDivider}>
                  <span style={styles.syncDividerText}>or join existing</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    style={{ ...styles.modalInput, marginBottom: 0, flex: 1, textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center", fontSize: 18, fontFamily: "'JetBrains Mono', monospace" }}
                    placeholder="ABC123"
                    value={joinCode}
                    maxLength={6}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <button
                    onClick={() => {
                      if (joinSyncCode(joinCode)) setJoinCode("");
                    }}
                    style={{ ...styles.modalSaveBtn, background: "#1971C2", padding: "12px 20px" }}
                  >
                    Join
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={styles.syncInfoText}>Your devices are linked with this code:</p>
                <div style={styles.syncCodeDisplay}>
                  {syncCode.split("").map((ch, i) => (
                    <span key={i} style={styles.syncCodeChar}>{ch}</span>
                  ))}
                </div>
                <p style={{ ...styles.syncInfoText, marginTop: 8 }}>
                  Enter this code on your other devices to sync.
                </p>
                <button
                  onClick={() => { disconnectSync(); }}
                  style={{ ...styles.modalCancelBtn, width: "100%", marginTop: 16, padding: "10px", color: "#E03131", borderColor: "#E03131" }}
                >
                  Disconnect Sync
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSyncPanel(false)}
              style={{ ...styles.modalCancelBtn, width: "100%", marginTop: 12, padding: "10px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "16px",
    fontFamily: "'DM Sans', sans-serif",
    background: "#F8F9FA",
    minHeight: "100vh",
  },
  loadScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontFamily: "'DM Sans', sans-serif",
  },
  loadIcon: { fontSize: 48, marginBottom: 12 },
  progressSection: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    background: "#fff",
    borderRadius: 16,
    padding: "20px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  progressRing: { position: "relative", flexShrink: 0 },
  progressText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    textAlign: "center",
  },
  progressNum: { display: "block", fontSize: 22, fontWeight: 700, color: "#1A1B1E", fontFamily: "'JetBrains Mono', monospace" },
  progressLabel: { fontSize: 11, color: "#868E96", fontWeight: 500 },
  progressInfo: { flex: 1 },
  progressTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1B1E" },
  progressSub: { margin: "4px 0 0", fontSize: 13, color: "#868E96" },
  tabs: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    padding: "10px",
    border: "2px solid #E9ECEF",
    borderRadius: 12,
    background: "#fff",
    fontSize: 14,
    fontWeight: 600,
    color: "#868E96",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "#1A1B1E",
    color: "#fff",
    borderColor: "#1A1B1E",
  },
  cards: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    transition: "all 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  cardLeft: { display: "flex", alignItems: "center", gap: 12 },
  catIcon: { fontSize: 28 },
  catLabel: { margin: 0, fontSize: 15, fontWeight: 700 },
  catDesc: { margin: "2px 0 0", fontSize: 12, color: "#868E96" },
  cardRight: { display: "flex", alignItems: "center", gap: 10 },
  streak: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 20,
    fontFamily: "'JetBrains Mono', monospace",
  },
  subProgress: {
    fontSize: 12,
    color: "#868E96",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
  },
  checkBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "2.5px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    transition: "all 0.2s",
  },
  expanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #E9ECEF",
  },
  catActions: {
    display: "flex",
    gap: 4,
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1px solid #F1F3F5",
  },
  catActionBtn: {
    background: "none",
    border: "none",
    borderRadius: 6,
    padding: "4px 6px",
    fontSize: 11,
    cursor: "pointer",
    color: "#ADB5BD",
    opacity: 0.7,
  },
  subtasks: { display: "flex", flexDirection: "column", gap: 8 },
  subtask: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
  },
  subCheck: {
    width: 18,
    height: 18,
    cursor: "pointer",
    accentColor: "#E8590C",
    flexShrink: 0,
  },
  subText: { transition: "all 0.2s", cursor: "default" },
  subtaskEditInput: {
    flex: 1,
    padding: "4px 8px",
    border: "1.5px solid #DEE2E6",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
  },
  subtaskBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 11,
    padding: "2px 4px",
    opacity: 0.4,
    flexShrink: 0,
    color: "#868E96",
  },
  addSubtaskInline: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    color: "#495057",
    background: "transparent",
    padding: "2px 0",
  },
  addCatBtn: {
    background: "none",
    border: "none",
    fontSize: 12,
    fontWeight: 600,
    color: "#ADB5BD",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    padding: "8px 0",
    alignSelf: "center",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: { margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1A1B1E" },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #DEE2E6",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    marginBottom: 10,
    boxSizing: "border-box",
  },
  colorPicker: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    cursor: "pointer",
  },
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalCancelBtn: {
    padding: "8px 16px",
    border: "1.5px solid #DEE2E6",
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  modalSaveBtn: {
    padding: "8px 20px",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  insightCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  challengeRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  challengeIcon: { fontSize: 28, flexShrink: 0 },
  challengeLabel: { margin: 0, fontSize: 10, fontWeight: 600, color: "#ADB5BD", textTransform: "uppercase", letterSpacing: "0.05em" },
  challengeText: { margin: "3px 0 0", fontSize: 13, fontWeight: 500, color: "#343A40", lineHeight: 1.4 },
  miniStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "10px 0",
    borderTop: "1px solid #F1F3F5",
    borderBottom: "1px solid #F1F3F5",
    marginBottom: 12,
  },
  miniStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  miniStatNum: { fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#1A1B1E" },
  miniStatLabel: { fontSize: 10, color: "#ADB5BD", fontWeight: 500 },
  miniStatDivider: { width: 1, height: 28, background: "#F1F3F5" },
  funFact: { display: "flex", alignItems: "flex-start", gap: 8 },
  funFactIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  funFactText: { margin: 0, fontSize: 11, color: "#868E96", lineHeight: 1.5, fontStyle: "italic" },
  noteSection: { marginTop: 10 },
  noteInput: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #DEE2E6",
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  noteDisplay: {
    padding: "6px 0",
    fontSize: 12,
    color: "#ADB5BD",
    cursor: "pointer",
    lineHeight: 1.5,
  },
  weekView: { display: "flex", flexDirection: "column", gap: 10 },
  weekCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  weekHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
    color: "#1A1B1E",
  },
  weekCount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13 },
  weekGrid: { display: "flex", justifyContent: "space-between" },
  weekDay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  dayLabel: { fontSize: 11, color: "#868E96", fontWeight: 600 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    transition: "all 0.2s",
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    position: "absolute",
    bottom: -4,
  },
  statsCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  statsTitle: { margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1A1B1E" },
  statsGrid: { display: "flex", justifyContent: "space-around" },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  statEmoji: { fontSize: 24 },
  statNum: { fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },
  statLabel: { fontSize: 11, color: "#868E96", fontWeight: 500 },
  footer: {
    marginTop: 16,
    padding: "16px",
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { margin: 0, fontSize: 12, color: "#868E96", lineHeight: 1.8, fontStyle: "italic", flex: 1 },
  resetBtn: {
    background: "rgba(0,0,0,0.05)",
    border: "none",
    color: "#868E96",
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
  syncBtn: {
    background: "rgba(0,0,0,0.05)",
    border: "none",
    color: "#868E96",
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
  syncInfo: {},
  syncInfoText: { fontSize: 13, color: "#868E96", lineHeight: 1.6, margin: 0 },
  syncDivider: {
    textAlign: "center",
    position: "relative",
    marginTop: 4,
  },
  syncDividerText: {
    fontSize: 12,
    color: "#ADB5BD",
    background: "#FFFDF9",
    padding: "0 12px",
    position: "relative",
    zIndex: 1,
  },
  syncCodeDisplay: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    margin: "16px 0",
  },
  syncCodeChar: {
    width: 40,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    background: "#F8F9FA",
    borderRadius: 10,
    color: "#1A1B1E",
    border: "1.5px solid #DEE2E6",
  },
};
