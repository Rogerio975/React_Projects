import express from 'express'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT) || 3001
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDirectory = process.env.BARBERSHOP_DATA_DIR || path.join(os.homedir(), '.navalha-barbearia')
const dataFile = path.join(dataDirectory, 'appointments.json')
const services = new Map([
  ['Corte de cabelo', { duration: 45, price: 45 }],
  ['Barba', { duration: 30, price: 35 }],
  ['Cabelo + barba', { duration: 75, price: 70 }],
  ['Acabamento', { duration: 20, price: 25 }],
])
const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']
let mutationQueue = Promise.resolve()

await mkdir(dataDirectory, { recursive: true })
try {
  await readFile(dataFile, 'utf8')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  await writeFile(dataFile, '[]\n', 'utf8')
}

app.use(express.json({ limit: '16kb' }))

async function readAppointments() {
  const appointments = JSON.parse(await readFile(dataFile, 'utf8'))
  if (!Array.isArray(appointments)) throw new Error('O arquivo de agendamentos precisa conter uma lista.')
  return appointments
}

async function writeAppointments(appointments) {
  const temporaryFile = `${dataFile}.${process.pid}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(appointments, null, 2)}\n`, 'utf8')
  await rename(temporaryFile, dataFile)
}

function queueMutation(operation) {
  const result = mutationQueue.then(operation)
  mutationQueue = result.then(() => {}, () => {})
  return result
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function normalizeAppointment(body, { allowPast = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Informe os dados do agendamento.' }
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const serviceName = typeof body.service === 'string' ? body.service : ''
  const service = services.get(serviceName)
  const date = typeof body.date === 'string' ? body.date : ''
  const time = typeof body.time === 'string' ? body.time : ''

  if (!name || name.length > 70) return { error: 'Informe um nome de cliente de até 70 caracteres.' }
  if (!phone || phone.length > 20) return { error: 'Informe um telefone de até 20 caracteres.' }
  if (!service) return { error: 'Selecione um serviço válido.' }
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!dateParts) return { error: 'Informe uma data válida.' }
  const [, year, month, day] = dateParts
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day))
  if (parsedDate.getFullYear() !== Number(year) || parsedDate.getMonth() !== Number(month) - 1 || parsedDate.getDate() !== Number(day)) {
    return { error: 'Informe uma data válida.' }
  }

  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (!allowPast && date < todayString) return { error: 'Escolha uma data a partir de hoje.' }
  if (!timeSlots.includes(time)) return { error: 'Selecione um horário válido.' }
  if (minutesFromTime(time) + service.duration > 19 * 60) {
    return { error: 'O atendimento precisa terminar até as 19h.' }
  }

  return {
    appointment: {
      name,
      phone,
      service: serviceName,
      date,
      time,
      duration: service.duration,
      price: service.price,
      status: 'confirmed',
    },
  }
}

function hasConflict(appointments, candidate, excludedId) {
  const service = services.get(candidate.service)
  const start = minutesFromTime(candidate.time)
  const end = start + service.duration

  return appointments.some((appointment) => {
    if (appointment.id === excludedId || appointment.status === 'cancelled' || appointment.date !== candidate.date) return false
    const otherService = services.get(appointment.service)
    if (!otherService) return appointment.time === candidate.time
    const otherStart = minutesFromTime(appointment.time)
    return start < otherStart + otherService.duration && end > otherStart
  })
}

app.get('/api/appointments', async (_request, response, next) => {
  try {
    response.json(await readAppointments())
  } catch (error) {
    next(error)
  }
})

app.post('/api/appointments/import', async (request, response, next) => {
  try {
    if (!Array.isArray(request.body) || request.body.length > 1000) {
      return response.status(400).json({ error: 'A importação deve conter até 1.000 agendamentos.' })
    }

    return await queueMutation(async () => {
      const appointments = await readAppointments()
      const importedIds = new Set()

      for (const legacyAppointment of request.body) {
        const result = normalizeAppointment(legacyAppointment, { allowPast: true })
        if (result.error) return response.status(400).json({ error: `Importação interrompida: ${result.error}` })
        if (legacyAppointment.status && !['confirmed', 'cancelled'].includes(legacyAppointment.status)) {
          return response.status(400).json({ error: 'A importação contém um status de agendamento inválido.' })
        }

        const id = typeof legacyAppointment.id === 'string' && legacyAppointment.id.trim()
          ? legacyAppointment.id
          : randomUUID()
        if (importedIds.has(id)) {
          return response.status(400).json({ error: 'A importação contém identificadores duplicados.' })
        }
        importedIds.add(id)
        if (appointments.some((appointment) => appointment.id === id)) continue

        const appointment = {
          ...result.appointment,
          id,
          status: legacyAppointment.status || 'confirmed',
        }
        if (hasConflict(appointments, appointment)) {
          return response.status(409).json({ error: `Importação interrompida: conflito no horário de ${appointment.name}.` })
        }
        appointments.push(appointment)
      }

      await writeAppointments(appointments)
      return response.status(201).json(appointments)
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/appointments', async (request, response, next) => {
  try {
    const result = normalizeAppointment(request.body)
    if (result.error) return response.status(400).json({ error: result.error })

    return await queueMutation(async () => {
      const appointments = await readAppointments()
      if (hasConflict(appointments, result.appointment)) {
        return response.status(409).json({ error: 'Esse horário conflita com outro atendimento. Escolha outro horário.' })
      }

      const appointment = { ...result.appointment, id: randomUUID() }
      appointments.push(appointment)
      await writeAppointments(appointments)
      return response.status(201).json(appointment)
    })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/appointments/:id', async (request, response, next) => {
  try {
    const result = normalizeAppointment(request.body)
    if (result.error) return response.status(400).json({ error: result.error })

    return await queueMutation(async () => {
      const appointments = await readAppointments()
      const index = appointments.findIndex((appointment) => appointment.id === request.params.id)
      if (index === -1) return response.status(404).json({ error: 'Agendamento não encontrado.' })
      if (hasConflict(appointments, result.appointment, request.params.id)) {
        return response.status(409).json({ error: 'Esse horário conflita com outro atendimento. Escolha outro horário.' })
      }

      const appointment = { ...result.appointment, id: request.params.id }
      appointments[index] = appointment
      await writeAppointments(appointments)
      return response.json(appointment)
    })
  } catch (error) {
    return next(error)
  }
})

app.patch('/api/appointments/:id/cancel', async (request, response, next) => {
  try {
    return await queueMutation(async () => {
      const appointments = await readAppointments()
      const index = appointments.findIndex((appointment) => appointment.id === request.params.id)
      if (index === -1) return response.status(404).json({ error: 'Agendamento não encontrado.' })

      const appointment = { ...appointments[index], status: 'cancelled' }
      appointments[index] = appointment
      await writeAppointments(appointments)
      return response.json(appointment)
    })
  } catch (error) {
    return next(error)
  }
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Rota da API não encontrada.' })
})

app.use(express.static(path.join(projectRoot, 'dist')))
app.get(/.*/, (_request, response, next) => {
  response.sendFile(path.join(projectRoot, 'dist', 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use((error, _request, response, next) => {
  if (response.headersSent) return next(error)
  console.error(error)
  return response.status(500).json({ error: 'Não foi possível concluir a operação. Tente novamente.' })
})

app.listen(port, () => {
  console.log(`API Navalha disponível em http://localhost:${port}`)
})
