const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')

const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Note = require('../models/note')

const helper = require('./test_helper')

const api = supertest(app)

beforeEach(async () => {
  await Note.deleteMany({})
  await Note.insertMany(helper.initialNotes)
})

test('notes are returned as json', async () => {
  console.log('starting test')
  await api
    .get('/api/notes')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all notes are returned', async () => {
  const response = await api.get('/api/notes')

  assert.strictEqual(response.body.length, helper.initialNotes.length)
})

test('a specific note is within the returned notes', async () => {
  const response = await api.get('/api/notes')

  const contents = response.body.map((e) => e.content)
  assert(contents.includes('HTML is easy'))
})

test('add a new valid note', async () => {
  const newNote = {
    content: 'async/await simplifies making async calls',
    important: true,
  }

  await api
    .post('/api/notes')
    .send(newNote)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const notesAtEnd = await helper.notesInDb()
  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length + 1)

  const contents = notesAtEnd.map((n) => n.content)
  assert(contents.includes('async/await simplifies making async calls'))
})

test('note without content is not added', async () => {
  const newNote = {
    important: true,
  }

  await api.post('/api/notes').send(newNote).expect(400)
  const notesAtEnd = await helper.notesInDb()
  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length)
})

test('a specific note can be viewed', async () => {
  const notesAtStart = await helper.notesInDb()
  const noteToView = notesAtStart[0]

  const resultNote = await api
    .get(`/api/notes/${noteToView.id}`)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  assert.deepStrictEqual(resultNote.body, noteToView)
})

test('a note can be deleted', async () => {
  const notesAtStart = await helper.notesInDb()
  const noteToDelete = notesAtStart[0]

  await api.delete(`/api/notes/${noteToDelete.id}`).expect(204)

  const notesAtEnd = await helper.notesInDb()

  const ids = notesAtEnd.map((n) => n.id)
  assert(!ids.includes(noteToDelete.id))

  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length - 1)
})

test('a note can be changed', async () => {
  const notesAtStart = await helper.notesInDb()
  const noteToChange = notesAtStart[0]

  const newContent = { content: 'new_stuff', important: true }

  await api.put(`/api/notes/${noteToChange.id}`).send(newContent).expect(200)

  const notesAtEnd = await helper.notesInDb()

  const ids = notesAtEnd.map((n) => n.id)
  assert(ids.includes(noteToChange.id))

  assert.strictEqual(notesAtEnd.length, helper.initialNotes.length)

  const response = await api.get(`/api/notes/${noteToChange.id}`).expect(200)

  assert.deepStrictEqual(newContent.content, response.body.content)
})

after(async () => {
  await mongoose.connection.close()
})
