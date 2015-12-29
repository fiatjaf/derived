"use strict"

const collate = require('pouchdb-collate')
const Derived = require('./derived')

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
    this._derived[idxName] = new Derived(this._raw, idxName, fn)

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
