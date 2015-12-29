"use strict"

const collate = require('pouchdb-collate')
const O = require('object-path')

const Derived = require('./derived')

module.exports = class Source {
  constructor (obj) {
    this._raw = obj || {}
    this._derived = {}
  }

  keys () {
    return Object.keys(this._raw)
  }

  get (k, d) {
    return O.get(this._raw, k, d)
  }

  has (k) {
    return O.has(this._raw, k)
  }

  coalesce (ks, d) {
    return O.coalesce(O, this._raw, ks, d)
  }

  set (k, v) {
    O.set(this._raw, k, v)
    this.changed(k)
  }

  del (k) {
    O.del(this._raw, k)
    this.changed(k)
  }

  empty (k) {
    O.empty(k)
    this.changed(k)
  }

  insert (k, v, p) {
    O.insert(this._raw, k, v, p)
    this.changed(k)
  }

  push (k, v) {
    O.push(this._raw, k, v)
    this.changed(k)
  }

  ensureExists (k, d) {
    O.ensureExists(this._raw, k, d)
    this.changed(k)
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
    k = k.split('.')[0]
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
