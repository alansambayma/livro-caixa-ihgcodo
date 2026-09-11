import React, { useState, useEffect, useMemo } from "react";
import bandeiraCodo from "./assets/bandeira-codo.png";
import {
  Users,
  Wallet,
  LayoutDashboard,
  Plus,
  Trash2,
  X,
  Phone,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  LogOut,
  Lock,
} from "lucide-react";

const STORAGE_KEY = "ihgcodo-tesouraria-data";
const AUTH_KEY = "ihgcodo-auth";
const ADMIN_EMAIL = "alancbayma@gmail.com";
// Hash SHA-256 da senha do admin — nunca a senha em texto puro.
const ADMIN_PASSWORD_HASH = "ca241cdc39c6e851e9df12270257aec6ba88d826e03f5442502960253f132537";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function waLink(phone, message) {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const PIX_KEY = "13.443.649/0001-29";

function cobrancaMessage(name, monthLabel, year, amount, tone) {
  const firstName = name.split(" ")[0];
  const valor = currency(amount);
  if (tone === "a_vencer") {
    return `Olá, ${firstName}! Passando para lembrar que a mensalidade de ${monthLabel}/${year} do IHGCODÓ (${valor}) vence em breve. Chave Pix para pagamento: ${PIX_KEY}. Qualquer dúvida, é só chamar por aqui. Obrigado por fazer parte da nossa história! 🙏`;
  }
  return `Olá, ${firstName}! Tudo bem? Passando para lembrar da mensalidade de ${monthLabel}/${year} do IHGCODÓ, no valor de ${valor}, que está em aberto. Chave Pix para pagamento: ${PIX_KEY}. Se já tiver pago, pode desconsiderar. Qualquer dúvida, é só chamar por aqui. Obrigado por fazer parte da nossa história! 🙏`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SEED_MEMBERS = [
  { name: "Alan Carlos", phone: "(99) 98501-0022" },
  { name: "Augusto Serra", phone: "(99) 98803-2965" },
  { name: "Cândido Sousa", phone: "(99) 99905-2832" },
  { name: "Célio Guerra", phone: "(99) 98105-6267" },
  { name: "Cinthia dos Santos", phone: "(98) 98161-7143" },
  { name: "Cristiane Anaisse", phone: "(99) 98811-6717" },
  { name: "Elias Alves", phone: "(98) 99704-4153" },
  { name: "Elizângela Siqueira", phone: "(99) 98144-4738" },
  { name: "Emanuela Carvalho", phone: "(99) 98859-6907" },
  { name: "Ferdinando Rocha", phone: "(98) 98152-0751" },
  { name: "Gervásio Rodrigues", phone: "(98) 99119-2779" },
  { name: "Hômulo Buzar", phone: "(98) 98134-8781" },
  { name: "Iedo Barros", phone: "(99) 98823-7190" },
  { name: "Luisa D'lly", phone: "(99) 98493-3138" },
  { name: "Maria Goreth", phone: "(99) 98123-0569" },
  { name: "Melissia Abreu", phone: "(99) 99902-6931" },
  { name: "Raimunda Ariana", phone: "(99) 98116-5834" },
  { name: "Romylson Leal", phone: "(99) 98157-6154" },
  { name: "Rosalva Komora", phone: "(99) 98101-2576" },
  { name: "Rosina Benvindo", phone: "(99) 98140-6701" },
  { name: "Socorro Quinzeiro", phone: "(99) 98140-6701" },
].map((m, i) => ({ id: `m${i + 1}`, ...m }));

const SEED_TRANSACTIONS = [];

const DEFAULT_DATA = {
  members: SEED_MEMBERS,
  payments: [], // { id, memberId, month: 'YYYY-MM', paidDate, amount }
  transactions: SEED_TRANSACTIONS,
  monthlyFee: 20,
  dueDay: 5,
};

function currency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getStatus(memberId, year, month, dueDay, payments) {
  const key = monthKey(year, month);
  const paid = payments.find((p) => p.memberId === memberId && p.month === key);
  if (paid) return { status: "pago", paid };
  const today = new Date();
  const due = new Date(year, month - 1, dueDay);
  const diffDays = Math.ceil((due - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  if (diffDays < 0) return { status: "atrasado", diffDays };
  if (diffDays <= 5) return { status: "a_vencer", diffDays };
  return { status: "em_dia", diffDays };
}

const STATUS_META = {
  pago: { label: "Pago", color: "var(--stamp-green)" },
  atrasado: { label: "Atrasado", color: "var(--stamp-red)" },
  a_vencer: { label: "A vencer", color: "var(--stamp-gold)" },
  em_dia: { label: "Em dia", color: "var(--ink-light)" },
};

function Stamp({ status }) {
  const meta = STATUS_META[status];
  return (
    <span className="stamp" style={{ "--stamp-color": meta.color }}>
      {meta.label}
    </span>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === "1");
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_DATA;
    } catch (e) {
      return DEFAULT_DATA;
    }
  });
  const [tab, setTab] = useState("painel");
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    }
  }, []);

  function persist(next) {
    setData(next);
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Erro ao salvar", e);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }

  const balance = useMemo(() => {
    if (!data) return 0;
    return data.transactions.reduce(
      (acc, t) => acc + (t.type === "entrada" ? t.amount : -t.amount),
      0
    );
  }, [data]);

  const totals = useMemo(() => {
    if (!data) return { in: 0, out: 0 };
    return data.transactions.reduce(
      (acc, t) => {
        if (t.type === "entrada") acc.in += t.amount;
        else acc.out += t.amount;
        return acc;
      },
      { in: 0, out: 0 }
    );
  }, [data]);

  const monthStatuses = useMemo(() => {
    if (!data) return [];
    return data.members
      .map((m) => ({ member: m, ...getStatus(m.id, viewYear, viewMonth, data.dueDay, data.payments) }))
      .sort((a, b) => {
        const order = { atrasado: 0, a_vencer: 1, em_dia: 2, pago: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.member.name.localeCompare(b.member.name, "pt-BR");
      });
  }, [data, viewYear, viewMonth]);

  const currentMonthStatuses = useMemo(() => {
    if (!data) return [];
    const y = now.getFullYear(), mo = now.getMonth() + 1;
    return data.members.map((m) => ({ member: m, ...getStatus(m.id, y, mo, data.dueDay, data.payments) }));
  }, [data]);

  if (!authed) {
    return <LoginGate onSuccess={() => setAuthed(true)} />;
  }

  function markPaid(memberId) {
    const payment = {
      id: `p${Date.now()}`,
      memberId,
      month: monthKey(viewYear, viewMonth),
      paidDate: todayISO(),
      amount: data.monthlyFee,
    };
    const nextPayments = [...data.payments, payment];
    const nextTx = [
      ...data.transactions,
      {
        id: `t${Date.now()}`,
        type: "entrada",
        description: `Mensalidade — ${data.members.find((m) => m.id === memberId)?.name || ""} (${MONTHS[viewMonth - 1]}/${viewYear})`,
        amount: data.monthlyFee,
        date: todayISO(),
        category: "Mensalidade",
      },
    ];
    persist({ ...data, payments: nextPayments, transactions: nextTx });
  }

  function undoPaid(memberId) {
    const key = monthKey(viewYear, viewMonth);
    const paymentToRemove = data.payments.find((p) => p.memberId === memberId && p.month === key);
    const nextPayments = data.payments.filter((p) => !(p.memberId === memberId && p.month === key));
    let nextTx = data.transactions;
    if (paymentToRemove) {
      const idx = nextTx.findIndex(
        (t) =>
          t.category === "Mensalidade" &&
          t.amount === paymentToRemove.amount &&
          t.date === paymentToRemove.paidDate &&
          t.description.includes(data.members.find((m) => m.id === memberId)?.name || "§§")
      );
      if (idx !== -1) {
        nextTx = [...nextTx.slice(0, idx), ...nextTx.slice(idx + 1)];
      }
    }
    persist({ ...data, payments: nextPayments, transactions: nextTx });
  }

  function addMember(member) {
    persist({ ...data, members: [...data.members, { id: `m${Date.now()}`, ...member }] });
  }
  function removeMember(id) {
    persist({
      ...data,
      members: data.members.filter((m) => m.id !== id),
      payments: data.payments.filter((p) => p.memberId !== id),
    });
  }
  function addTransaction(tx) {
    persist({ ...data, transactions: [{ id: `t${Date.now()}`, ...tx }, ...data.transactions] });
  }
  function removeTransaction(id) {
    persist({ ...data, transactions: data.transactions.filter((t) => t.id !== id) });
  }
  function updateSettings(fee, dueDay) {
    persist({ ...data, monthlyFee: fee, dueDay });
    setShowSettings(false);
  }

  const atrasados = currentMonthStatuses.filter((s) => s.status === "atrasado");
  const aVencer = currentMonthStatuses.filter((s) => s.status === "a_vencer");
  const pagosCount = currentMonthStatuses.filter((s) => s.status === "pago").length;

  const TAB_LABELS = { painel: "Painel", mensalidades: "Mensalidades", membros: "Membros", caixa: "Caixa" };

  return (
    <div className="ihg-root">
      <GlobalStyle />
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <img src={bandeiraCodo} alt="Bandeira de Codó" className="logo-flag brand-flag" />
            <div className="brand-text">
              <span className="brand-name">Finanças IHGC</span>
              <span className="brand-sub">Instituto Histórico e Geográfico de Codó</span>
            </div>
          </div>

          <nav className="side-nav" role="tablist" aria-label="Seções">
            <SideNavButton active={tab === "painel"} onClick={() => setTab("painel")} icon={<LayoutDashboard size={16} />} label="Painel" />
            <SideNavButton active={tab === "mensalidades"} onClick={() => setTab("mensalidades")} icon={<Users size={16} />} label="Mensalidades" />
            <SideNavButton active={tab === "membros"} onClick={() => setTab("membros")} icon={<Users size={16} />} label="Membros" />
            <SideNavButton active={tab === "caixa"} onClick={() => setTab("caixa")} icon={<Wallet size={16} />} label="Caixa" />
          </nav>

          <div className="sidebar-foot">
            <button className="sidebar-settings-btn" onClick={() => setShowSettings(true)}>
              <Settings2 size={15} /> Configurações
            </button>
            <button className="sidebar-settings-btn" onClick={logout}>
              <LogOut size={15} /> Sair
            </button>
            <span className="sync-status">{saving ? "salvando…" : "salvo neste navegador"}</span>
          </div>
        </aside>

        <div className="spine" aria-hidden="true"></div>

        <main className="content">
          <div className="content-inner">
            <header className="content-head">
              <span className="eyebrow">{TAB_LABELS[tab]}</span>
              <h2>
                {tab === "painel" && "Visão geral do caixa"}
                {tab === "mensalidades" && `${MONTHS[viewMonth - 1]} de ${viewYear}`}
                {tab === "membros" && `Membros (${data.members.length})`}
                {tab === "caixa" && "Livro de movimentações"}
              </h2>
            </header>

            {tab === "painel" && (
              <section>
                <div className="hero-entry">
                  <span className="hero-label">Saldo em caixa</span>
                  <span className={`hero-value ${balance < 0 ? "neg" : ""}`}>{currency(balance)}</span>
                  <div className="hero-sub">
                    <span className="in"><ArrowUpCircle size={13} /> {currency(totals.in)} entradas</span>
                    <span className="out"><ArrowDownCircle size={13} /> {currency(totals.out)} saídas</span>
                    <span className="muted">· {data.transactions.length} lançamentos no total</span>
                  </div>
                </div>

                <div className="kpi-row">
                  <div className="kpi pago">
                    <span className="kpi-num">{pagosCount}</span>
                    <span className="kpi-label"><CheckCircle2 size={12} /> pagos em {MONTHS[now.getMonth()]}</span>
                  </div>
                  <div className="kpi vencer">
                    <span className="kpi-num">{aVencer.length}</span>
                    <span className="kpi-label">a vencer</span>
                  </div>
                  <div className="kpi atraso">
                    <span className="kpi-num">{atrasados.length}</span>
                    <span className="kpi-label">atrasados</span>
                  </div>
                </div>

                <div className="lists-grid">
                  <div className="card list-card">
                    <h3>Atrasados este mês</h3>
                    {atrasados.length === 0 && <p className="empty">Ninguém atrasado. 🎉</p>}
                    <ul>
                      {atrasados.map((s) => (
                        <li key={s.member.id}>
                          <span>{s.member.name}</span>
                          <span className="row-actions">
                            <a href={`tel:${s.member.phone.replace(/\D/g, "")}`}><Phone size={13} /> {s.member.phone}</a>
                            <a
                              className="wa-btn"
                              href={waLink(s.member.phone, cobrancaMessage(s.member.name, MONTHS[now.getMonth()], now.getFullYear(), data.monthlyFee, "atrasado"))}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Cobrar ${s.member.name} no WhatsApp`}
                            >
                              <MessageCircle size={13} />
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card list-card">
                    <h3>Vencendo em breve</h3>
                    {aVencer.length === 0 && <p className="empty">Nada vencendo nos próximos dias.</p>}
                    <ul>
                      {aVencer.map((s) => (
                        <li key={s.member.id}>
                          <span>{s.member.name}</span>
                          <span className="row-actions">
                            <span className="muted">{s.diffDays === 0 ? "vence hoje" : `vence em ${s.diffDays}d`}</span>
                            <a
                              className="wa-btn"
                              href={waLink(s.member.phone, cobrancaMessage(s.member.name, MONTHS[now.getMonth()], now.getFullYear(), data.monthlyFee, "a_vencer"))}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Lembrar ${s.member.name} no WhatsApp`}
                            >
                              <MessageCircle size={13} />
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {tab === "mensalidades" && (
              <section>
                <div className="month-nav">
                  <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
                  <span>{MONTHS[viewMonth - 1]} de {viewYear}</span>
                  <button onClick={() => shiftMonth(1)} aria-label="Próximo mês"><ChevronRight size={18} /></button>
                  <span className="fee-pill">Mensalidade: {currency(data.monthlyFee)} · vence dia {data.dueDay}</span>
                </div>
                <div className="table-card">
                  <div className="ledger">
                    <div className="ledger-head">
                      <span>Membro</span>
                      <span>Status</span>
                      <span>Ação</span>
                    </div>
                    {monthStatuses.map(({ member, status, paid }) => (
                      <div className="ledger-row" key={member.id}>
                        <span className="name">{member.name}</span>
                        <span><Stamp status={status} /> {status === "pago" && paid ? <span className="muted small">em {fmtDate(paid.paidDate)}</span> : null}</span>
                        <span className="row-actions">
                          {status === "pago" ? (
                            <button className="link-btn" onClick={() => undoPaid(member.id)}><RotateCcw size={13} /> desfazer</button>
                          ) : (
                            <>
                              <button className="mark-btn" onClick={() => markPaid(member.id)}>Marcar pago</button>
                              <a
                                className="wa-btn"
                                href={waLink(member.phone, cobrancaMessage(member.name, MONTHS[viewMonth - 1], viewYear, data.monthlyFee, status))}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Cobrar ${member.name} no WhatsApp`}
                              >
                                <MessageCircle size={13} />
                              </a>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {tab === "membros" && (
              <section>
                <div className="section-head end">
                  <button className="add-btn" onClick={() => setShowMemberForm(true)}><Plus size={15} /> Adicionar membro</button>
                </div>
                <div className="table-card">
                  <div className="ledger">
                    <div className="ledger-head">
                      <span>Nome</span>
                      <span>Contato</span>
                      <span></span>
                    </div>
                    {data.members
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                      .map((m) => (
                      <div className="ledger-row" key={m.id}>
                        <span className="name">{m.name}</span>
                        <span className="mono">{m.phone || "—"}</span>
                        <span>
                          <button className="icon-btn danger" onClick={() => removeMember(m.id)} aria-label="Remover">
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {tab === "caixa" && (
              <section>
                <div className="section-head">
                  <div className="totals-row">
                    <span className="in"><ArrowUpCircle size={14} /> Entradas: {currency(totals.in)}</span>
                    <span className="out"><ArrowDownCircle size={14} /> Saídas: {currency(totals.out)}</span>
                  </div>
                  <button className="add-btn" onClick={() => setShowTxForm(true)}><Plus size={15} /> Lançar</button>
                </div>
                <div className="table-card">
                  <div className="ledger">
                    <div className="ledger-head tx-grid">
                      <span>Data</span>
                      <span>Descrição</span>
                      <span>Categoria</span>
                      <span>Valor</span>
                      <span></span>
                    </div>
                    {data.transactions.length === 0 && <p className="empty">Nenhum lançamento ainda.</p>}
                    {data.transactions
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((t) => (
                        <div className="ledger-row tx-grid" key={t.id}>
                          <span className="mono">{fmtDate(t.date)}</span>
                          <span>{t.description}</span>
                          <span className="muted">{t.category}</span>
                          <span className={`mono ${t.type === "entrada" ? "in" : "out"}`}>
                            {t.type === "entrada" ? "+" : "−"}{currency(t.amount)}
                          </span>
                          <span>
                            <button className="icon-btn danger" onClick={() => removeTransaction(t.id)} aria-label="Remover">
                              <Trash2 size={14} />
                            </button>
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {showMemberForm && <MemberForm onClose={() => setShowMemberForm(false)} onSave={addMember} />}
      {showTxForm && <TxForm onClose={() => setShowTxForm(false)} onSave={addTransaction} />}
      {showSettings && (
        <SettingsForm
          fee={data.monthlyFee}
          dueDay={data.dueDay}
          onClose={() => setShowSettings(false)}
          onSave={updateSettings}
        />
      )}
    </div>
  );

  function shiftMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }
}

function LoginGate({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setChecking(true);
    setError("");
    const hash = await sha256Hex(password);
    setChecking(false);
    if (hash === ADMIN_PASSWORD_HASH) {
      localStorage.setItem(AUTH_KEY, "1");
      onSuccess();
    } else {
      setError("Senha incorreta.");
    }
  }

  return (
    <div className="ihg-root ihg-login">
      <GlobalStyle />
      <form className="login-box" onSubmit={handleSubmit}>
        <img src={bandeiraCodo} alt="Bandeira de Codó" className="logo-flag" />
        <span className="login-brand">Finanças IHGC</span>
        <span className="login-sub">Instituto Histórico e Geográfico de Codó</span>
        <label className="login-field">
          E-mail
          <input value={ADMIN_EMAIL} disabled />
        </label>
        <label className="login-field">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </label>
        {error && <span className="login-error">{error}</span>}
        <button type="submit" className="primary-btn" disabled={checking}>
          <Lock size={15} /> {checking ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function SideNavButton({ active, onClick, icon, label }) {
  return (
    <button className={`side-nav-btn ${active ? "active" : ""}`} onClick={onClick} role="tab" aria-selected={active}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MemberForm({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <Modal title="Adicionar membro" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({ name: name.trim(), phone: phone.trim() });
          onClose();
        }}
      >
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></label>
        <label>Telefone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(99) 99999-9999" /></label>
        <button type="submit" className="primary-btn">Salvar</button>
      </form>
    </Modal>
  );
}

function TxForm({ onClose, onSave }) {
  const [type, setType] = useState("entrada");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("");
  return (
    <Modal title="Novo lançamento" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseFloat(amount.replace(",", "."));
          if (!description.trim() || !v) return;
          onSave({ type, description: description.trim(), amount: v, date, category: category.trim() || (type === "entrada" ? "Receita" : "Despesa") });
          onClose();
        }}
      >
        <div className="type-toggle">
          <button type="button" className={type === "entrada" ? "active in" : "in"} onClick={() => setType("entrada")}>
            <ArrowUpCircle size={15} /> Entrada
          </button>
          <button type="button" className={type === "saida" ? "active out" : "out"} onClick={() => setType("saida")}>
            <ArrowDownCircle size={15} /> Saída
          </button>
        </div>
        <label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)} required autoFocus /></label>
        <label>Categoria<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ex: Doação, Aluguel, Evento" /></label>
        <div className="row-2">
          <label>Valor (R$)<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" required /></label>
          <label>Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        </div>
        <button type="submit" className="primary-btn">Lançar</button>
      </form>
    </Modal>
  );
}

function SettingsForm({ fee, dueDay, onClose, onSave }) {
  const [f, setF] = useState(String(fee));
  const [d, setD] = useState(String(dueDay));
  return (
    <Modal title="Configurações da mensalidade" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const feeVal = parseFloat(f.replace(",", "."));
          const dueVal = parseInt(d, 10);
          if (!feeVal || !dueVal) return;
          onSave(feeVal, dueVal);
        }}
      >
        <label>Valor da mensalidade (R$)<input value={f} onChange={(e) => setF(e.target.value)} inputMode="decimal" required /></label>
        <label>Dia do vencimento<input value={d} onChange={(e) => setD(e.target.value)} inputMode="numeric" required /></label>
        <button type="submit" className="primary-btn">Salvar</button>
      </form>
    </Modal>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:wght@400;500;600&display=swap');

      .ihg-root {
        --paper: #FAF7F1;
        --paper-card: #F1ECE0;
        --ink: #1B1811;
        --ink-light: #5E5748;
        --cover: #0C0D10;
        --cover-light: #1A1C21;
        --accent: #7C1723;
        --accent-light: #9C2432;
        --gold: #A9832E;
        --stamp-green: #2E6B3E;
        --stamp-red: #8C1D24;
        --stamp-gold: #A9832E;
        --rule: #E1D9C6;
        font-family: 'Source Serif 4', Georgia, serif;
        color: var(--ink);
        background: var(--paper);
        min-height: 100%;
        width: 100%;
        font-feature-settings: "tnum" 1, "lnum" 1;
      }
      .ihg-root * { box-sizing: border-box; }
      .ihg-root { --sidebar-w: 244px; }

      .ihg-login {
        display: flex; align-items: center; justify-content: center; min-height: 100vh;
        background: linear-gradient(180deg, var(--cover) 0%, var(--cover-light) 100%);
        padding: 24px;
      }
      .login-box {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        background: var(--paper); border-radius: 10px; padding: 34px 32px 28px;
        width: 100%; max-width: 340px; text-align: center;
        border-top: 4px solid var(--accent);
      }
      .login-box .logo-flag { width: 44px; height: 44px; margin-bottom: 10px; border-color: var(--rule); box-shadow: none; }
      .login-brand { font-family: 'Libre Caslon Text', serif; font-weight: 700; font-size: 1.2rem; }
      .login-sub { font-family: 'IBM Plex Mono', monospace; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ink-light); margin-bottom: 20px; }
      .login-field { display: flex; flex-direction: column; gap: 5px; width: 100%; text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.4px; color: var(--ink-light); margin-bottom: 12px; }
      .login-field input { font-family: 'Source Serif 4', serif; font-size: 0.95rem; padding: 9px 11px; border: 1px solid var(--rule); border-radius: 6px; background: #fff; color: var(--ink); }
      .login-field input:disabled { background: var(--paper-card); color: var(--ink-light); }
      .login-error { color: var(--stamp-red); font-size: 0.82rem; margin-bottom: 10px; }
      .login-box .primary-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; }

      .shell { display: flex; min-height: 100vh; align-items: stretch; }

      .sidebar {
        width: var(--sidebar-w); flex-shrink: 0;
        background: linear-gradient(180deg, var(--cover) 0%, var(--cover-light) 100%);
        color: #EFE6CC;
        display: flex; flex-direction: column; gap: 30px;
        padding: 24px 18px; position: sticky; top: 0; height: 100vh; overflow-y: auto;
      }
      .brand { display: flex; gap: 10px; align-items: center; }
      .brand-text { display: flex; flex-direction: column; min-width: 0; }
      .brand-name { font-family: 'Libre Caslon Text', serif; font-weight: 700; font-size: 1.05rem; line-height: 1.2; letter-spacing: 0.3px; }
      .brand-sub { margin-top: 3px; font-family: 'IBM Plex Mono', monospace; font-size: 0.62rem; line-height: 1.4; opacity: 0.68; letter-spacing: 0.6px; text-transform: uppercase; }

      .logo-flag { width: 38px; height: 38px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(239,230,204,0.35); box-shadow: 0 1px 3px rgba(0,0,0,0.4); flex-shrink: 0; }

      .side-nav { display: flex; flex-direction: column; gap: 2px; }
      .side-nav-btn {
        display: flex; align-items: center; gap: 10px;
        background: transparent; border: none; border-left: 3px solid transparent;
        color: rgba(239,230,204,0.72); font-family: 'Source Serif 4', serif; font-size: 0.9rem;
        padding: 10px 12px; border-radius: 0 6px 6px 0; cursor: pointer; text-align: left;
      }
      .side-nav-btn:hover { background: rgba(239,230,204,0.08); color: #EFE6CC; }
      .side-nav-btn.active { background: rgba(239,230,204,0.1); color: #fff; font-weight: 600; border-left-color: var(--gold); }

      .sidebar-foot { margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(239,230,204,0.15); }
      .sidebar-settings-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid rgba(239,230,204,0.35); color: inherit; border-radius: 6px; padding: 8px 10px; cursor: pointer; font-size: 0.82rem; font-family: 'Source Serif 4', serif; }
      .sidebar-settings-btn:hover { background: rgba(239,230,204,0.1); }
      .sync-status { font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem; opacity: 0.6; letter-spacing: 0.3px; }

      .spine {
        width: 7px; flex-shrink: 0;
        background: repeating-linear-gradient(180deg, #0C0D10 0 18px, #FAF7F1 18px 21px, #7C1723 21px 39px, #FAF7F1 39px 42px);
      }

      .content { flex: 1; min-width: 0; background: var(--paper); }
      .content-inner { max-width: 960px; margin: 0 auto; padding: 34px 30px 48px; }
      .content-head { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--rule); }
      .eyebrow { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; letter-spacing: 1.6px; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
      .content-head h2 { font-family: 'Libre Caslon Text', serif; font-weight: 700; font-size: 1.55rem; margin: 0; letter-spacing: 0.1px; }

      .hero-entry { position: relative; overflow: hidden; background: var(--paper-card); border: 1px solid var(--rule); border-radius: 10px; padding: 26px 28px 24px 32px; margin-bottom: 18px; }
      .hero-entry::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); }
      .hero-label { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--ink-light); margin-bottom: 10px; }
      .hero-value { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: clamp(2rem, 4vw, 2.6rem); color: var(--stamp-green); line-height: 1.1; letter-spacing: -0.5px; }
      .hero-value.neg { color: var(--stamp-red); }
      .hero-sub { margin-top: 12px; display: flex; gap: 18px; flex-wrap: wrap; font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; }
      .hero-sub .in { color: var(--stamp-green); display: flex; align-items: center; gap: 4px; }
      .hero-sub .out { color: var(--stamp-red); display: flex; align-items: center; gap: 4px; }
      .hero-sub .muted { color: var(--ink-light); }

      .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
      .kpi { background: var(--paper); border: 1px solid var(--rule); border-left: 3px solid var(--ink-light); border-radius: 6px; padding: 14px 16px; }
      .kpi-num { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.3px; }
      .kpi-label { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.6px; color: var(--ink-light); margin-top: 4px; }
      .kpi.pago { border-left-color: var(--stamp-green); }
      .kpi.vencer { border-left-color: var(--stamp-gold); }
      .kpi.atraso { border-left-color: var(--stamp-red); }

      .lists-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media (max-width: 700px) { .lists-grid { grid-template-columns: 1fr; } .kpi-row { grid-template-columns: 1fr; } }
      .card { background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; padding: 16px; }
      .list-card h3 { margin: 0 0 10px; font-family: 'Libre Caslon Text', serif; font-weight: 700; font-size: 1rem; }
      .list-card ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .list-card li { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; border-bottom: 1px dashed var(--rule); padding-bottom: 6px; }
      .list-card a { color: var(--accent); text-decoration: none; display: flex; align-items: center; gap: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; }
      .empty { color: var(--ink-light); font-size: 0.85rem; font-style: italic; }

      .row-actions { display: flex; align-items: center; gap: 8px; }
      .wa-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; border-radius: 50%;
        background: #25D366; color: #fff; flex-shrink: 0;
      }
      .wa-btn:hover { filter: brightness(0.95); }

      .month-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-family: 'Libre Caslon Text', serif; font-weight: 700; flex-wrap: wrap; }
      .month-nav button { background: var(--paper); border: 1px solid var(--rule); border-radius: 6px; padding: 5px; cursor: pointer; color: var(--ink); }
      .fee-pill { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 0.74rem; background: var(--paper); border: 1px solid var(--rule); border-radius: 20px; padding: 5px 13px; margin-left: auto; color: var(--ink-light); letter-spacing: 0.2px; }

      .table-card { background: var(--paper-card); border: 1px solid var(--rule); border-radius: 8px; padding: 4px 18px 6px; }
      .ledger { border-top: 1px solid var(--rule); }
      .ledger-head { display: grid; grid-template-columns: 1.4fr 1fr 1fr; padding: 11px 4px; font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--ink-light); border-bottom: 1px solid var(--rule); }
      .ledger-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; align-items: center; padding: 11px 4px; border-bottom: 1px dashed var(--rule); font-size: 0.88rem; }
      .ledger-row:last-child { border-bottom: none; }
      .ledger-row .name { font-weight: 600; }
      .tx-grid { grid-template-columns: 0.8fr 1.6fr 1fr 0.9fr 0.4fr; }

      .stamp {
        display: inline-block;
        position: relative;
        border: 1.5px solid var(--stamp-color);
        outline: 1px solid var(--stamp-color);
        outline-offset: 2px;
        color: var(--stamp-color);
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.64rem;
        font-weight: 600;
        letter-spacing: 1.2px;
        padding: 3px 9px;
        margin: 2px;
        border-radius: 2px;
        transform: rotate(-1.5deg);
        text-transform: uppercase;
      }
      .small.muted { font-size: 0.72rem; margin-left: 6px; }
      .muted { color: var(--ink-light); }
      .mono { font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem; }
      .mono.in { color: var(--stamp-green); }
      .mono.out { color: var(--stamp-red); }

      .mark-btn { background: var(--cover); color: var(--paper); border: none; border-radius: 5px; padding: 6px 10px; font-size: 0.78rem; cursor: pointer; }
      .link-btn { background: none; border: none; color: var(--ink-light); font-size: 0.76rem; display: flex; align-items: center; gap: 4px; cursor: pointer; text-decoration: underline; }

      .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; flex-wrap: wrap; }
      .section-head.end { justify-content: flex-end; }
      .add-btn { display: flex; align-items: center; gap: 5px; background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 7px 12px; font-size: 0.82rem; cursor: pointer; font-family: 'Source Serif 4', serif; }
      .icon-btn { background: transparent; border: 1px solid var(--rule); color: var(--ink); border-radius: 6px; padding: 7px; cursor: pointer; display: inline-flex; }
      .icon-btn.danger { color: var(--stamp-red); border-color: var(--stamp-red); }

      .totals-row { display: flex; gap: 18px; font-size: 0.85rem; }
      .totals-row .in { color: var(--stamp-green); display: flex; gap: 5px; align-items: center; font-weight: 600; }
      .totals-row .out { color: var(--stamp-red); display: flex; gap: 5px; align-items: center; font-weight: 600; }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(10,10,10,0.55); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
      .modal { background: var(--paper); border-radius: 10px; padding: 22px; width: 100%; max-width: 420px; border: 1px solid var(--rule); }
      .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .modal-head h3 { font-family: 'Libre Caslon Text', serif; font-weight: 700; margin: 0; font-size: 1.15rem; }
      .form { display: flex; flex-direction: column; gap: 12px; }
      .form label { display: flex; flex-direction: column; gap: 5px; font-size: 0.78rem; color: var(--ink-light); text-transform: uppercase; letter-spacing: 0.4px; }
      .form input { font-family: 'Source Serif 4', serif; font-size: 0.95rem; padding: 9px 11px; border: 1px solid var(--rule); border-radius: 6px; background: #fff; color: var(--ink); }
      .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .primary-btn { background: var(--cover); color: var(--paper); border: none; border-radius: 6px; padding: 11px; font-size: 0.9rem; cursor: pointer; margin-top: 4px; font-family: 'Source Serif 4', serif; }
      .type-toggle { display: flex; gap: 8px; }
      .type-toggle button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; border: 1px solid var(--rule); background: #fff; cursor: pointer; font-size: 0.85rem; }
      .type-toggle button.active.in { background: var(--stamp-green); color: #fff; border-color: var(--stamp-green); }
      .type-toggle button.active.out { background: var(--stamp-red); color: #fff; border-color: var(--stamp-red); }

      .ihg-root :focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

      @media (max-width: 760px) {
        .shell { flex-direction: column; }
        .sidebar { width: 100%; height: auto; position: relative; flex-direction: row; align-items: center; gap: 16px; padding: 14px 16px; overflow-x: auto; }
        .brand-sub { display: none; }
        .side-nav { flex-direction: row; gap: 2px; }
        .side-nav-btn { border-left: none; border-bottom: 3px solid transparent; border-radius: 6px 6px 0 0; white-space: nowrap; }
        .side-nav-btn.active { border-bottom-color: var(--gold); }
        .sidebar-foot { margin-top: 0; margin-left: auto; flex-direction: row; align-items: center; border-top: none; padding-top: 0; }
        .sync-status { display: none; }
        .spine { display: none; }
        .content-inner { padding: 22px 16px 36px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .ihg-root * { transition: none !important; animation: none !important; }
      }
    `}</style>
  );
}
