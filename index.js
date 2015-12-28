"use strict"

const collate = require('pouchdb-collate')

class Derived {
  constructor (name, fn) {
    this.name = name
    this._fn = fn
    this._values = {}
    this._bySourceKey = {}
  }

  get (k) {
    let v = this._values[collate.toIndexableString(k)]
    return v ? v.value : null
  }

  getSource (k) {
    let v = this._values[collate.toIndexableString(k)]
    return v ? v.source : null
  }

  keys () {
    return Object.keys(this._values).map(is => collate.parseIndexableString(is))
  }

  _clearBySourceKey (sourceKey) {
    let toClear = this._bySourceKey[sourceKey]
    if (toClear) {
      toClear.forEach(idxKey => {
        delete this._values[idxKey]
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

  _emitted (sourceKey, sourceValue, idxKey, idxValue) {
    idxKey = collate.toIndexableString(idxKey)

    this._bySourceKey[sourceKey] = this._bySourceKey[sourceKey] || []
    this._bySourceKey[sourceKey].push(idxKey)
    this._values[idxKey] = {value: idxValue, source: sourceValue}
  }
}

module.exports = class Source {
  constructor (obj) {
    this._raw = obj || {}
    this._derived = {}
  }

  set (k, v) {
    this._raw[k] = v
    this.changed(k)
  }

  unset (k) {
    delete this._raw[k]
    this.changed(k)
  }

  get (k) {
    if (!k) return this._raw
    return this._raw[k]
  }

  keys () {
    return Object.keys(this._raw)
  }

  derived (idxName, fn) {
    this._derived[idxName] = new Derived(idxName, fn)

    for (let k in this._raw) {
      this.calcDerived(idxName, k)
    }

    Object.defineProperty(this, idxName, {
      configurable: false,
      writable: false,
      enumerable: true,
      value: this._derived[idxName]
    })
  }

  changed (k) {
    for (var idxName in this._derived) {
      this.calcDerived(idxName, k)
    }
  }

  calcDerived (idxName, k) {
    let drv = this._derived[idxName]

    drv._clearBySourceKey(k)

    let v = this._raw[k]
    if (v) {
      drv._addNewSource(k, v)
    }
  }
}
