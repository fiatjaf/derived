"use strict"

const collate = require('pouchdb-collate')
const get = require('get-object-path')

module.exports = class Derived {
  constructor (rawSource, name, fn) {
    this._name = name
    this._fn = fn
    this._rawSource = rawSource
    this._values = {}
    this._sources = {}
    this._bySourceKey = {}

    // hide fields so Object.keys work just like .keys().
    let fields = ['_name', '_fn', '_rawSource', '_values', '_sources', '_bySourceKey']
    fields.forEach(name => Object.defineProperty(this, name, {
      enumerable: false
    }))

    // changing the function should trigger a massive recalc
    Object.defineProperty(this, 'fn', {
      enumerable: false,
      configurable: false,
      set: n => {
        this._fn = n
        for (var sourceKey in this._bySourceKey) {
          this._clearBySourceKey(sourceKey)
        }
        for (var sourceKey in this._rawSource) {
          this._addNewSource(sourceKey, this._rawSource[sourceKey])
        }
      },
      get: () => this._fn
    })
  }

  get (k, d) {
    var fk = k
    var sk = null
    if (typeof k == 'string') {
      let parts = k.split(/\.|\[|\]/)
      fk = parts[0]
      sk = parts.slice(1).join('.')
    }
    let value = this.getAll(fk)[0]
    return (sk ? get(value, sk) : value) || d
  }

  getSource (k, d) {
    if (typeof k == 'string') {
      k = k.split(/\.|\[|\]/g)
    } else if (!Array.isArray(k)) {
      k = [k]
    }
    let source = this.getAllSources(k[0])[0]
    return (k.length > 1 ? get(source, k.slice(1).join('.')) : source) || d
  }

  getAll (k) {
    return this._values[collate.toIndexableString(k)] || []
  }

  getAllSources (k) {
    return this._sources[collate.toIndexableString(k)] || []
  }

  keys () {
    return Object.keys(this._values).map(s => collate.parseIndexableString(s))
  }

  _clearBySourceKey (sourceKey) {
    let toClear = this._bySourceKey[sourceKey]
    if (toClear) {
      toClear.forEach(idxKey => {
        delete this._values[idxKey]
        delete this._sources[idxKey]
        delete this[collate.parseIndexableString(idxKey)]
      })
    }

    delete this._bySourceKey[sourceKey]
  }

  _addNewSource (sourceKey, sourceValue) {
    var nothingEmitted = true

    // this will be passed to the user-defined functions as 'this'
    let ctx = {
      emit: (idxKey, idxValue) => {
        nothingEmitted = false
        this._emitted(sourceKey, sourceValue, idxKey, idxValue)
      }
    }

    let res = this._fn.call(ctx, sourceKey, sourceValue)
    if (nothingEmitted && res) {
      // returning a value is the same as emitting it, for enabling
      // quick indexes like `src.derived('inverted', (k, v) => [v, k])`
      // or `src.derived('inverted', (k, v) => v)`
      var idxKey, idxValue
      if (Array.isArray(res)) {
        idxKey = res[0]
        idxValue = res[1]
      } else {
        idxKey = res
        idxValue = sourceValue
      }
      this._emitted(sourceKey, sourceValue, idxKey, idxValue)
    }
  }

  _emitted (sourceKey, sourceValue, idxReadableKey, idxValue) {
    let idxKey = collate.toIndexableString(idxReadableKey)

    this._bySourceKey[sourceKey] = this._bySourceKey[sourceKey] || []
    this._bySourceKey[sourceKey].push(idxKey)
    this._values[idxKey] = this._values[idxKey] || []
    this._values[idxKey].push(idxValue)
    this._sources[idxKey] = this._sources[idxKey] || []
    this._sources[idxKey].push(sourceValue)

    // magic to access indexed keys just like normal keys, should be the same as calling .get
    Object.defineProperty(this, idxReadableKey, {
      enumerable: true,
      configurable: true,
      set: () => false,
      get: () => this.get(idxReadableKey)
    })
  }
}
