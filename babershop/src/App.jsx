import { useEffect, useMemo, useState } from 'react'
import './App.css'

const services = [
  { name: 'Corte de cabelo', duration: 45, price: 45 },
  { name: 'Barba', duration: 30, price: 35 },
  { name: 'Cabelo + barba', duration: 75, price: 70 },
  { name: 'Acabamento', duration: 20, price: 25 },
]

const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']
const storageKey = 'barbearia-agendamentos'
const today = new Date()
const todayString = formatDate(today)
const closingTime = 19 * 60

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonday(date) {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatLongDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatMonth(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function availableTimeSlots(serviceName) {
  const service = services.find((item) => item.name === serviceName)
  return timeSlots.filter((time) => minutesFromTime(time) + (service?.duration ?? 0) <= closingTime)
}

function loadAppointments() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function Icon({ name, size = 20 }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    scissors: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="m8.2 8.2 12 12M14.8 9.2 20 4M8.2 15.8l4.5-4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7.6 9.5a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.6 1.9Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function App() {
  const [appointments, setAppointments] = useState(loadAppointments)
  const [selectedDate, setSelectedDate] = useState(todayString)
  const [weekStart, setWeekStart] = useState(() => getMonday(today))
  const [showCancelled, setShowCancelled] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm(todayString))
  const [error, setError] = useState('')

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(appointments))
  }, [appointments])

  const visibleAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.date === selectedDate)
    .filter((appointment) => showCancelled ? appointment.status === 'cancelled' : appointment.status !== 'cancelled')
    .sort((first, second) => first.time.localeCompare(second.time)), [appointments, selectedDate, showCancelled])

  const activeAppointments = appointments.filter((appointment) => appointment.status !== 'cancelled')
  const todayAppointments = activeAppointments.filter((appointment) => appointment.date === todayString)
  const nextAppointment = activeAppointments
    .filter((appointment) => `${appointment.date}T${appointment.time}` >= `${todayString}T${new Date().toTimeString().slice(0, 5)}`)
    .sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`))[0]
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })

  function openForm(appointment = null) {
    setEditingAppointment(appointment)
    setForm(appointment ? { ...appointment } : emptyForm(selectedDate))
    setError('')
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingAppointment(null)
    setError('')
  }

  function changeWeek(offset) {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() + offset * 7)
    setWeekStart(newStart)
    const chosenDate = new Date(newStart)
    setSelectedDate(formatDate(chosenDate))
  }

  function saveAppointment(event) {
    event.preventDefault()
    const service = services.find((item) => item.name === form.service)
    if (!service) {
      setError('Selecione um serviço válido.')
      return
    }
    if (form.date < todayString) {
      setError('Escolha uma data a partir de hoje.')
      return
    }

    const start = minutesFromTime(form.time)
    const end = start + service.duration
    if (end > closingTime) {
      setError('O atendimento precisa terminar até as 19h.')
      return
    }
    const conflict = appointments.some((appointment) => {
      if (appointment.status === 'cancelled' || appointment.date !== form.date || appointment.id === editingAppointment?.id) return false
      const otherService = services.find((item) => item.name === appointment.service)
      if (!otherService) return appointment.time === form.time
      const otherStart = minutesFromTime(appointment.time)
      return start < otherStart + otherService.duration && end > otherStart
    })

    if (conflict) {
      setError('Esse horário conflita com outro atendimento. Escolha outro horário.')
      return
    }

    const updated = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      price: service.price,
      duration: service.duration,
      status: 'confirmed',
    }

    setAppointments((current) => editingAppointment
      ? current.map((appointment) => appointment.id === editingAppointment.id ? { ...updated, id: appointment.id } : appointment)
      : [...current, { ...updated, id: crypto.randomUUID() }])
    setSelectedDate(form.date)
    const chosenDate = new Date(`${form.date}T12:00:00`)
    setWeekStart(getMonday(chosenDate))
    closeForm()
  }

  function cancelAppointment(appointment) {
    if (!window.confirm(`Deseja cancelar o horário de ${appointment.name}?`)) return
    setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status: 'cancelled' } : item))
  }

  const selectedIsPast = selectedDate < todayString

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Navalha, início">
          <span className="brand-mark"><Icon name="scissors" size={23} /></span>
          <span>NAVALHA<span className="brand-dot">.</span><small>BARBEARIA</small></span>
        </a>
        <div className="sidebar-label">MENU PRINCIPAL</div>
        <button className="nav-item active" type="button"><Icon name="calendar" /> <span>Agendamentos</span></button>
        <div className="sidebar-card">
          <span className="sidebar-card-icon"><Icon name="scissors" size={18} /></span>
          <p>Um bom corte começa com um bom horário.</p>
          <span>Cuide de cada detalhe.</span>
        </div>
        <div className="sidebar-footer"><span className="status-dot" /> Barbearia aberta <span>·</span> até 19h</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Navalha <span>/</span> <strong>Agendamentos</strong></div>
          <div className="today-label"><span className="status-dot" /> Hoje, {today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">SUA ROTINA, NO RITMO CERTO</span>
              <h1>Agendamentos</h1>
              <p>Organize seus horários e deixe cada cliente no estilo.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => openForm()}><Icon name="plus" size={18} /> Novo agendamento</button>
          </div>

          <section className="stats-grid" aria-label="Resumo dos agendamentos">
            <article className="stat-card">
              <span className="stat-icon dark"><Icon name="calendar" /></span>
              <div><span className="stat-label">Atendimentos hoje</span><strong>{todayAppointments.length.toString().padStart(2, '0')}</strong></div>
              <span className="stat-caption">horários confirmados</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon gold"><Icon name="clock" /></span>
              <div><span className="stat-label">Próximo cliente</span><strong className="next-client">{nextAppointment?.time ?? '—'}</strong></div>
              <span className="stat-caption">{nextAppointment ? `${nextAppointment.date === todayString ? 'Hoje' : new Date(`${nextAppointment.date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · ${nextAppointment.name}` : 'sem próximos atendimentos'}</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon green"><Icon name="check" /></span>
              <div><span className="stat-label">Na agenda</span><strong>{activeAppointments.length.toString().padStart(2, '0')}</strong></div>
              <span className="stat-caption">atendimentos ativos</span>
            </article>
          </section>

          <section className="schedule-panel">
            <div className="schedule-heading">
              <div><span className="eyebrow">AGENDA DA SEMANA</span><h2>{formatMonth(weekStart)}</h2></div>
              <div className="week-controls">
                <button className="icon-button" type="button" onClick={() => changeWeek(-1)} aria-label="Semana anterior"><Icon name="left" /></button>
                <button className="today-button" type="button" onClick={() => { setSelectedDate(todayString); setWeekStart(getMonday(today)) }}>Hoje</button>
                <button className="icon-button" type="button" onClick={() => changeWeek(1)} aria-label="Próxima semana"><Icon name="right" /></button>
              </div>
            </div>
            <div className="week-strip">
              {weekDays.map((day) => {
                const dateString = formatDate(day)
                const count = activeAppointments.filter((appointment) => appointment.date === dateString).length
                return (
                  <button className={`day-button ${selectedDate === dateString ? 'selected' : ''} ${dateString === todayString ? 'is-today' : ''}`} type="button" key={dateString} onClick={() => setSelectedDate(dateString)}>
                    <span>{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    <strong>{day.getDate()}</strong>
                    <i className={count ? 'has-appointments' : ''} aria-label={`${count} agendamentos`} />
                  </button>
                )
              })}
            </div>

            <div className="appointments-heading">
              <div><h3>{formatLongDate(selectedDate)}</h3><span>{visibleAppointments.length} {visibleAppointments.length === 1 ? 'atendimento' : 'atendimentos'}</span></div>
              <button className={`filter-button ${showCancelled ? 'filter-active' : ''}`} type="button" onClick={() => setShowCancelled((current) => !current)}>
                {showCancelled ? 'Ver agenda' : 'Ver cancelados'}
                {appointments.some((appointment) => appointment.date === selectedDate && appointment.status === 'cancelled') && !showCancelled && <span className="cancelled-count">{appointments.filter((appointment) => appointment.date === selectedDate && appointment.status === 'cancelled').length}</span>}
              </button>
            </div>

            {visibleAppointments.length > 0 ? (
              <div className="appointment-list">
                {visibleAppointments.map((appointment) => (
                  <article className={`appointment-card ${appointment.status === 'cancelled' ? 'cancelled-card' : ''}`} key={appointment.id}>
                    <div className="appointment-time"><strong>{appointment.time}</strong><span>{appointment.duration} min</span></div>
                    <div className="timeline"><span /></div>
                    <div className="appointment-details">
                      <strong>{appointment.name}</strong>
                      <span><Icon name="scissors" size={15} /> {appointment.service}</span>
                    </div>
                    <div className="appointment-contact"><Icon name="phone" size={15} /> {appointment.phone}</div>
                    <div className="appointment-price">R$ {Number(appointment.price).toFixed(2).replace('.', ',')}</div>
                    {appointment.status === 'cancelled'
                      ? <span className="cancelled-badge">Cancelado</span>
                      : <div className="appointment-actions">
                        <button className="text-button" type="button" onClick={() => openForm(appointment)}>Remarcar</button>
                        <button className="cancel-button" type="button" onClick={() => cancelAppointment(appointment)} aria-label={`Cancelar horário de ${appointment.name}`}><Icon name="close" size={17} /></button>
                      </div>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon"><Icon name={showCancelled ? 'close' : 'calendar'} size={23} /></span>
                <strong>{showCancelled ? 'Nenhum horário cancelado' : 'Dia livre na cadeira'}</strong>
                <span>{showCancelled ? 'Não há cancelamentos para esta data.' : 'Aproveite para encaixar um novo cliente.'}</span>
                {!showCancelled && !selectedIsPast && <button className="text-button" type="button" onClick={() => openForm()}>+ Agendar horário</button>}
              </div>
            )}
          </section>
          <footer className="page-footer">NAVALHA BARBEARIA <span>·</span> Cada detalhe faz diferença.</footer>
        </div>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}>
          <section className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><span className="eyebrow">{editingAppointment ? 'AJUSTE NA AGENDA' : 'NOVO HORÁRIO'}</span><h2 id="modal-title">{editingAppointment ? 'Remarcar atendimento' : 'Agendar cliente'}</h2></div>
              <button className="icon-button" type="button" onClick={closeForm} aria-label="Fechar"><Icon name="close" /></button>
            </div>
            <form onSubmit={saveAppointment}>
              <label className="field-label">Nome do cliente<input autoFocus required maxLength="70" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: João Silva" /></label>
              <label className="field-label">Telefone<input required type="tel" maxLength="20" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(11) 99999-9999" /></label>
              <label className="field-label">Serviço<select value={form.service} onChange={(event) => {
                const service = event.target.value
                const slots = availableTimeSlots(service)
                setForm({ ...form, service, time: slots.includes(form.time) ? form.time : slots[0] })
              }}>{services.map((service) => <option value={service.name} key={service.name}>{service.name} · R$ {service.price},00</option>)}</select></label>
              <div className="field-row">
                <label className="field-label">Data<input required type="date" min={todayString} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
                <label className="field-label">Horário<select required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })}>{availableTimeSlots(form.service).map((time) => <option value={time} key={time}>{time}</option>)}</select></label>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="modal-actions"><button className="secondary-button" type="button" onClick={closeForm}>Voltar</button><button className="primary-button" type="submit"><Icon name={editingAppointment ? 'check' : 'plus'} size={17} /> {editingAppointment ? 'Salvar alteração' : 'Confirmar horário'}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

function emptyForm(date) {
  return { name: '', phone: '', service: services[0].name, date, time: '09:00' }
}

export default App
