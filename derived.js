"use strict"

const collate = require('pouchdb-collate')

module.exports = class Derived {
  constructor (rawSource, name, fn) {
    this._name = name
    this._fn = fn
    this._rawSource = rawSource
    this._values = {}
    this._bySourceKey = {}

    // hide fields so Object.keys work just like .keys().
    let fields = ['_name', '_fn', '_rawSource', '_values', '_bySourceKey']
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

  get (k) {
    return this.getAll(k)[0]
  }

  getSource (k) {
    return this.getAllSources(k)[0]
  }

  getAll (k) {
    let v = this._values[collate.toIndexableString(k)]
    return v ? v.map(i => i.value) : []
  }

  getAllSources (k) {
    let v = this._values[collate.toIndexableString(k)]
    return v ? v.map(i => i.source) : []
  }

  keys () {
    return Object.keys(this._values).map(s => collate.parseIndexableString(s))
  }

  _clearBySourceKey (sourceKey) {
    let toClear = this._bySourceKey[sourceKey]
    if (toClear) {
      toClear.forEach(idxKey => {
        delete this._values[idxKey]
        delete this[collate.parseIndexableString(idxKey)]
      })
    }

    delete this._bySourceKey[sourceKey]
  }

  _addNewSource (sourceKey, sourceValue) {
    // this will be passed to the user-defined functions as 'this'
    let ctx = {
      emit: this._emitted.bind(this, sourceKey, sourceValue)
    }

    let res = this._fn.call(ctx, sourceKey, sourceValue)
    if (res) {
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
    this._values[idxKey].push({value: idxValue, source: sourceValue})

    // magic to access indexed keys just like normal keys, should be the same as calling .get
    Object.defineProperty(this, idxReadableKey, {
      enumerable: true,
      configurable: true,
      writable: false,
      value: this.get(idxReadableKey)
    })
  }
}
